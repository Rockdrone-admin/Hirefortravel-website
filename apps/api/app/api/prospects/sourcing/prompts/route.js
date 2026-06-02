import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../../../lib/supabase';
import { getCorsHeaders } from '../../../../../lib/cors';
import { DEFAULT_SEARCH_INSTRUCTIONS, DEFAULT_SCORING_INSTRUCTIONS } from '../../../../../lib/gemini';
import { requireAuth, logActivityEvent } from '../../../../../lib/auth';

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function GET(req) {
  try {
    const environment = getEnvironment();
    // We only need to check permissions, no user details required for GET
    const { error: authError, status: authStatus } = await requireAuth('can_access_settings');
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });
    
    if (!supabase) {
      return NextResponse.json({
        success: true,
        data: [
          { prompt_type: 'search_query_generation', instructions: DEFAULT_SEARCH_INSTRUCTIONS },
          { prompt_type: 'candidate_scoring', instructions: DEFAULT_SCORING_INSTRUCTIONS },
          { prompt_type: 'enrichment_scraper', instructions: ['apify'] }
        ]
      }, { headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const { data: dbPrompts, error } = await supabase
      .from('sourcing_prompts')
      .select('*')
      .eq('environment', environment);

    // Merge DB results with default values if they are missing or if table is empty
    const result = [
      { prompt_type: 'search_query_generation', instructions: DEFAULT_SEARCH_INSTRUCTIONS },
      { prompt_type: 'candidate_scoring', instructions: DEFAULT_SCORING_INSTRUCTIONS },
      { prompt_type: 'enrichment_scraper', instructions: ['apify'] }
    ];

    if (!error && dbPrompts && dbPrompts.length > 0) {
      dbPrompts.forEach(dbItem => {
        const idx = result.findIndex(r => r.prompt_type === dbItem.prompt_type);
        if (idx !== -1 && dbItem.instructions && dbItem.instructions.length > 0) {
          result[idx] = {
            ...result[idx],
            id: dbItem.id,
            instructions: dbItem.instructions,
            updated_at: dbItem.updated_at
          };
        }
      });
    }

    return NextResponse.json({ success: true, data: result }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Failed to retrieve sourcing prompts:', err);
    // Graceful fallback to default prompts so the app never breaks
    return NextResponse.json({
      success: true,
      data: [
        { prompt_type: 'search_query_generation', instructions: DEFAULT_SEARCH_INSTRUCTIONS },
        { prompt_type: 'candidate_scoring', instructions: DEFAULT_SCORING_INSTRUCTIONS },
        { prompt_type: 'enrichment_scraper', instructions: ['apify'] }
      ]
    }, { headers: getCorsHeaders(req.headers.get('origin')) });
  }
}

export async function POST(req) {
  try {
    const environment = getEnvironment();
    const { user: authUser, error: authError, status: authStatus } = await requireAuth('can_access_settings');
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });

    const body = await req.json();
    const { promptType, instructions } = body;

    if (!promptType || !Array.isArray(instructions)) {
      return NextResponse.json({ success: false, error: 'promptType and instructions array are required parameters' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection not initialized' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Fetch all existing prompts in this environment to build a full unified snapshot before the new change is committed
    const { data: allPrompts } = await supabase
      .from('sourcing_prompts')
      .select('*')
      .eq('environment', environment);

    const existing = allPrompts?.find(p => p.prompt_type === promptType);

    // Capture the entire state BEFORE this update
    const searchPrompt = allPrompts?.find(p => p.prompt_type === 'search_query_generation');
    const scoringPrompt = allPrompts?.find(p => p.prompt_type === 'candidate_scoring');

    const snapshotConfig = {
      searchRules: (searchPrompt && searchPrompt.instructions && searchPrompt.instructions.length > 0) 
        ? searchPrompt.instructions 
        : DEFAULT_SEARCH_INSTRUCTIONS,
      scoringRules: (scoringPrompt && scoringPrompt.instructions && scoringPrompt.instructions.length > 0) 
        ? scoringPrompt.instructions 
        : DEFAULT_SCORING_INSTRUCTIONS,
      enrichmentScraper: (allPrompts?.find(p => p.prompt_type === 'enrichment_scraper')?.instructions) || ['apify']
    };

    const { error: snapshotErr } = await supabase
      .from('sourcing_prompt_versions')
      .insert([{
        config: snapshotConfig,
        environment
      }]);
      
    if (snapshotErr) {
      console.error('Failed to create unified snapshot version:', snapshotErr);
    }

    let resData, error;
    if (existing) {
      const { data, error: updateErr } = await supabase
        .from('sourcing_prompts')
        .update({
          instructions,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      resData = data;
      error = updateErr;
    } else {
      const { data, error: insertErr } = await supabase
        .from('sourcing_prompts')
        .insert([{
          prompt_type: promptType,
          instructions,
          environment
        }])
        .select()
        .single();

      resData = data;
      error = insertErr;
    }

    if (error) {
      console.error('Failed to save sourcing prompt:', error);
      return NextResponse.json({ success: false, error: 'Failed to save instructions to database' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Log Activity
    await logActivityEvent({
      user: authUser,
      event_type: 'AI_SETTINGS_UPDATED',
      entity_type: 'AI_PROMPT',
      entity_id: promptType,
      title: `Updated AI settings for ${promptType}`,
      environment
    });

    return NextResponse.json({ success: true, data: resData }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Save prompt failed:', err);
    return NextResponse.json({ success: false, error: 'Internal server error: ' + err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
