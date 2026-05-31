import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../../../lib/supabase';
import { getCorsHeaders } from '../../../../../lib/cors';
import { requireAuth, logActivityEvent } from '../../../../../lib/auth';

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function PATCH(req, { params }) {
  try {
    const environment = getEnvironment();
    const { user: authUser, error: authError, status: authStatus } = await requireAuth();
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });

    const matchId = params.id;
    const body = await req.json();
    
    // updates holds the fields to edit, changedBy is who is making the change (admin username)
    const { profileUpdates, matchUpdates, changedBy, reason } = body;

    if (!matchId) {
      return NextResponse.json({ success: false, error: 'Match ID is required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection not initialized' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // 1. Fetch current active state (for comparison & audit)
    const { data: currentMatch, error: matchError } = await supabase
      .from('prospect_matches')
      .select('*, prospect:prospect_id(*)')
      .eq('id', matchId)
      .eq('environment', environment)
      .single();

    if (matchError || !currentMatch) {
      return NextResponse.json({ success: false, error: 'Prospect match record not found' }, { status: 404, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const prospectId = currentMatch.prospect_id;
    const jobId = currentMatch.job_id;
    const currentProspect = currentMatch.prospect;

    const auditLogs = [];

    // 2. COMPARE AND AUDIT PROFILE CHANGES
    if (profileUpdates && Object.keys(profileUpdates).length > 0) {
      const pFieldsToUpdate = {};
      const fields = [
        'name', 'email', 'phone', 'city', 'linkedin_url', 
        'latest_title', 'latest_company', 'total_experience', 'functional_field'
      ];

      for (const field of fields) {
        if (profileUpdates[field] !== undefined && profileUpdates[field] !== currentProspect[field]) {
          pFieldsToUpdate[field] = profileUpdates[field];
          
          auditLogs.push({
            prospect_id: prospectId,
            job_id: jobId,
            changed_by: changedBy || 'Admin',
            activity_type: 'override',
            previous_value: String(currentProspect[field] || ''),
            new_value: String(profileUpdates[field] || ''),
            metadata: { field, reason },
            environment
          });
        }
      }

      if (Object.keys(pFieldsToUpdate).length > 0) {
        const { error: pUpdateErr } = await supabase
          .from('prospects')
          .update(pFieldsToUpdate)
          .eq('id', prospectId);

        if (pUpdateErr) {
          console.error('Failed to update prospect profile details:', pUpdateErr);
          return NextResponse.json({ success: false, error: 'Failed to update prospect profile details' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
        }
      }
    }

    // 3. COMPARE AND AUDIT MATCH CHANGES
    if (matchUpdates && Object.keys(matchUpdates).length > 0) {
      const mFieldsToUpdate = {};
      const matchFields = [
        'stage', 'manual_score', 'human_notes', 'active_flag', 
        'primary_flag', 'owner', 'tags', 'followup_due_at', 'last_contacted_at'
      ];

      for (const field of matchFields) {
        if (matchUpdates[field] !== undefined) {
          let hasChanged = false;
          
          // Deep array/object equality check for tags, string check for others
          if (field === 'tags') {
            const curTags = JSON.stringify(currentMatch.tags || []);
            const newTags = JSON.stringify(matchUpdates.tags || []);
            hasChanged = curTags !== newTags;
          } else {
            hasChanged = String(currentMatch[field] || '') !== String(matchUpdates[field] || '');
          }

          if (hasChanged) {
            mFieldsToUpdate[field] = matchUpdates[field];
            
            // Log stage changes explicitly as 'stage_change', others as 'override' or 'remark'
            let activityType = 'override';
            if (field === 'stage') activityType = 'stage_change';
            if (field === 'human_notes') activityType = 'remark';

            // Log transition timestamps inside lifecycle_timestamps if stage changes
            if (field === 'stage') {
              const currentTimestamps = currentMatch.lifecycle_timestamps || {};
              currentTimestamps[matchUpdates.stage] = new Date().toISOString();
              mFieldsToUpdate.lifecycle_timestamps = currentTimestamps;
            }

            auditLogs.push({
              prospect_id: prospectId,
              job_id: jobId,
              changed_by: changedBy || 'Admin',
              activity_type: activityType,
              previous_value: field === 'tags' ? JSON.stringify(currentMatch.tags || []) : String(currentMatch[field] || ''),
              new_value: field === 'tags' ? JSON.stringify(matchUpdates.tags || []) : String(matchUpdates[field] || ''),
              metadata: { field, reason },
              environment
            });
          }
        }
      }

      if (Object.keys(mFieldsToUpdate).length > 0) {
        const { error: mUpdateErr } = await supabase
          .from('prospect_matches')
          .update(mFieldsToUpdate)
          .eq('id', matchId);

        if (mUpdateErr) {
          console.error('Failed to update match details:', mUpdateErr);
          return NextResponse.json({ success: false, error: 'Failed to update prospect match stage' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
        }
      }
    }

    // 4. WRITE AUDIT ACTIVITIES (Legacy)
    if (auditLogs.length > 0) {
      const { error: auditErr } = await supabase
        .from('prospect_activities')
        .insert(auditLogs);

      if (auditErr) {
        console.error('Failed to write override audit trails:', auditErr);
      }
    }

    // 5. WRITE TO UNIFIED GLOBAL EVENT STORE (activity_events)
    if (auditLogs.length > 0) {
      let logType = 'UPDATE_CANDIDATE';
      let logTitle = `Updated overrides/details for candidate ${currentProspect.name || 'Profile'}`;

      const stageChange = auditLogs.find(log => log.metadata?.field === 'stage');
      if (stageChange) {
        logType = 'CHANGE_STAGE';
        logTitle = `Changed stage to ${stageChange.new_value} for ${currentProspect.name || 'Candidate'}`;
      }

      await logActivityEvent({
        user: authUser,
        event_type: logType,
        entity_type: 'prospect',
        entity_id: prospectId,
        title: logTitle,
        description: reason || null,
        metadata: {
          job_id: jobId,
          changes: auditLogs.map(l => ({
            field: l.metadata?.field,
            prev: l.previous_value,
            next: l.new_value
          }))
        },
        environment
      });
    }

    // Return the updated match state
    const { data: updatedMatch } = await supabase
      .from('prospect_matches')
      .select('*, prospect:prospect_id(*), job:job_id(*)')
      .eq('id', matchId)
      .single();

    return NextResponse.json({ success: true, data: updatedMatch }, { headers: getCorsHeaders(req.headers.get('origin')) });

  } catch (err) {
    console.error('CRM prospects PATCH failed:', err);
    return NextResponse.json({ success: false, error: 'Internal server error: ' + err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}

// Retrieves complete details of a single prospect match, including full timeline history
export async function GET(req, { params }) {
  try {
    const environment = getEnvironment();
    const matchId = params.id;

    if (!matchId) {
      return NextResponse.json({ success: false, error: 'Match ID is required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection not initialized' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // 1. Fetch prospect match details
    const { data: match, error: matchError } = await supabase
      .from('prospect_matches')
      .select('*, prospect:prospect_id(*), job:job_id(*)')
      .eq('id', matchId)
      .eq('environment', environment)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ success: false, error: 'Prospect match record not found' }, { status: 404, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // 2. Fetch full timeline from unified global event store (activity_events)
    const { data: activities } = await supabase
      .from('activity_events')
      .select('*')
      .eq('entity_type', 'prospect')
      .eq('entity_id', String(match.prospect_id))
      .eq('environment', environment)
      .order('created_at', { ascending: false });

    // 3. Fetch all other matches for the same prospect across all positions
    const { data: allMatches } = await supabase
      .from('prospect_matches')
      .select('*, job:job_id(*)')
      .eq('prospect_id', match.prospect_id)
      .eq('environment', environment);

    return NextResponse.json({ 
      success: true, 
      data: {
        ...match,
        timeline: activities || [],
        allMatches: allMatches || []
      }
    }, { headers: getCorsHeaders(req.headers.get('origin')) });

  } catch (err) {
    console.error('CRM single prospect GET failed:', err);
    return NextResponse.json({ success: false, error: 'Internal server error: ' + err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
