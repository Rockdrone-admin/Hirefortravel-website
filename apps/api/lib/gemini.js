import { GoogleGenAI } from '@google/genai';
import { getGoogleAuthOptions } from './google-auth';
import { supabase, getEnvironment } from './supabase';

let ai = null;

// Lazy-initialization strictly using Vertex AI with dynamic credentials (ADC / WIF)
function getAiClient() {
  if (!ai) {
    const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || 'amiable-anagram-495103-c4';
    const location = process.env.GCP_LOCATION || 'global';
    
    console.log(`[AI Engine: Init] Initializing Vertex AI client for project: ${project}, location: ${location}...`);
    
    // Explicitly initialize the client with Vertex AI. Let any authentication or project setup errors throw directly.
    ai = new GoogleGenAI({
      vertexai: true,
      project: project,
      location: location,
      googleAuthOptions: getGoogleAuthOptions()
    });
  }
  return ai;
}

/**
 * Executes a Gemini API call with exponential backoff and jitter if rate limited (429/RESOURCE_EXHAUSTED).
 */
async function callGeminiWithRetry(apiCall, maxRetries = 5, initialDelay = 2000) {
  let attempt = 0;
  while (true) {
    try {
      return await apiCall();
    } catch (err) {
      attempt++;
      const isRateLimit = 
        err.status === 429 || 
        err.statusCode === 429 || 
        (err.message && (
          err.message.includes('429') || 
          err.message.includes('RESOURCE_EXHAUSTED') ||
          err.message.includes('Resource exhausted')
        ));
        
      if (isRateLimit && attempt <= maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.warn(`[AI Engine: Retry] ⚠️ Gemini rate limit hit (429/RESOURCE_EXHAUSTED). Error: ${err.message || err}. Retrying attempt ${attempt}/${maxRetries} after ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}

// 1. Text instructions set up for the Search Query Generation AI
export const DEFAULT_SEARCH_INSTRUCTIONS = [
  "Extract the primary job title/role targeted.",
  "Identify key technical and functional skills required.",
  "Extract explicitly mentioned competitors or key similar companies from the job description.",
  "Suggest 3-5 similar industry competitors likely to have suitable talent.",
  "Generate up to 3 highly optimized Google X-Ray Search Queries for LinkedIn in the exact format: site:linkedin.com/in (\"role name\" OR \"alternative title\") (\"skill A\" OR \"skill B\") (\"Competitor A\" OR \"Competitor B\")."
];

// 2. Text instructions set up for the Candidate Scoring AI
export const DEFAULT_SCORING_INSTRUCTIONS = [
  "Calculate a candidate fit score between 0 and 100 based strictly on experience alignment, title relevance, skills, and background.",
  "For the Location factor, consider this priority order: 1. Same City 2. Nearby Cities 3. Same State. CRITICAL GEOGRAPHIC BOUNDARY: If the candidate is located in a completely different country or distant region than the job location (e.g. Makati, Philippines vs Mumbai, India), you MUST award a score of 0 for Location (unless the job description explicitly mentions Remote work).",
  "Assess the candidate's latest company stature and relevance to the targeted position.",
  "Evaluate chronological career gaps, career trajectory, and professional progression quality.",
  "Write a professional fit reasoning explaining why this candidate matches (or does not match), highlighting key strengths and gaps.",
  "Infer the candidate's core functional field (e.g. Visa Operations, Software Engineering, Sales) for proper CRM classification."
];

/**
 * Parses a Job Description (JD) and extracts parameters alongside boolean Google search dorks.
 * Uses gemini-2.5-flash for speed and cost-effectiveness.
 */
export async function parseJobDetailsAndGenerateDorks(job, existingTitles = [], existingCompanies = [], shouldPivot = false) {
  const client = getAiClient();
  const environment = getEnvironment ? getEnvironment() : 'development';
  
  let freshnessInstruction = '';
  if (existingTitles.length > 0 || existingCompanies.length > 0) {
    freshnessInstruction = `
    
    CRITICAL FRESHNESS REQUIREMENT:
    This role has already been sourced for in past runs. To ensure new and high-quality candidates, do NOT generate queries that focus on the exact same companies and job titles.
    - Already sourced companies to deprioritize/exclude: ${existingCompanies.join(', ')}
    - Already sourced titles to deprioritize/exclude: ${existingTitles.join(', ')}
    
    Generate 3 highly optimized queries focusing on alternative competitor companies, different title synonyms, or different skill combinations to uncover fresh candidates. Add creative synonym variations (e.g. target different departments or industry synonyms)!
    `;
  }

  if (shouldPivot) {
    freshnessInstruction += `
    
    CRITICAL STRATEGIC PIVOT REQUIRED:
    The previous sourcing run failed to yield a meaningful pool of high-scoring candidates. You MUST completely pivot and generate an ORTHOGONAL search angle:
    - Change competitor list: Shift targeting to completely different competitor companies or boutique industry players.
    - Change title synonyms: Shift to alternative functional keywords (e.g. "Visa Specialist", "Visa Expert", "Visa Ops Lead") rather than the exact primary titles previously used, keeping synonyms tightly focused on core duties.
    - Change skill mix: Prioritize other required skills or tools from the job details.
    `;
  }

  const realCompanyText = job.real_company_name ? `Hiring Company (Internal Use Only): ${job.real_company_name}\n` : '';
  const competitorsListStr = Array.isArray(job.competitors) ? job.competitors.join(', ') : '';
  const competitorsText = competitorsListStr ? `Known Target Competitor Companies (Internal Use Only): ${competitorsListStr}\n` : '';
  const altTitlesListStr = Array.isArray(job.alternative_titles) ? job.alternative_titles.join(', ') : '';
  const altTitlesText = altTitlesListStr ? `Suggested Alternative Titles (Internal Use Only): ${altTitlesListStr}\n` : '';
  const notesListStr = Array.isArray(job.notes) ? job.notes.join(', ') : job.notes || '';
  const notesText = notesListStr ? `Special Notes & Role Specifications (Internal Use Only): ${notesListStr}\n` : '';

  let competitorInstruction = '';
  if (competitorsListStr) {
    competitorInstruction = `
    
    CRITICAL COMPETITOR TARGETING REQUIREMENT:
    The employer has explicitly requested to source talent from these target competitor companies: ${competitorsListStr}.
    When generating Google X-Ray boolean search queries, you MUST prioritize and explicitly include these competitor company names in the company search parenthesis of your queries (e.g. ("${job.competitors.map(c => c.trim()).join('" OR "')}")).
    `;
  }

  let altTitlesInstruction = '';
  if (altTitlesListStr) {
    altTitlesInstruction = `
    
    CRITICAL SUGGESTED ALTERNATIVE TITLES REQUIREMENT:
    The employer has explicitly suggested targeting these alternative job titles: ${altTitlesListStr}.
    When generating alternate title synonyms or building Boolean search queries, you MUST prioritize and explicitly include these suggested alternative titles or variations in your dorks!
    `;
  }

  // Load custom instructions from DB if available, fallback to defaults
  let searchInstructions = DEFAULT_SEARCH_INSTRUCTIONS;
  if (supabase) {
    try {
      const { data } = await supabase
        .from('sourcing_prompts')
        .select('instructions')
        .eq('prompt_type', 'search_query_generation')
        .eq('environment', environment)
        .maybeSingle();
      if (data && data.instructions && data.instructions.length > 0) {
        searchInstructions = data.instructions;
      }
    } catch (e) {
      console.warn('[Sourcing Saga: DorkGen] ⚠️ Failed to fetch custom search prompts from DB, falling back to defaults:', e.message);
    }
  }

  const instructionsText = searchInstructions.map((inst, index) => `${index + 1}. ${inst}`).join('\n       - ');

  const prompt = `
    You are a professional recruitment AI sourcing agent. 
    Analyze the following job description and extract key details.
    
    Job Title: ${job.title}
    Company Type/Name: ${job.company_name}
    ${realCompanyText}${competitorsText}${altTitlesText}${notesText}Location: ${job.location}
    Experience required: ${job.experience}
    About the Role: ${job.about_role}
    Responsibilities: ${JSON.stringify(job.responsibilities)}
    Requirements: ${JSON.stringify(job.requirements)}
    
    GEOGRAPHIC SEARCH TARGETING:
    - Extract the country name and its 2-letter ISO country code (e.g. 'in' for India, 'us' for United States, 'ae' for UAE) based on the Job Location: ${job.location}.
    - Provide a list of 1-3 common synonyms or spelling variations for the job's target city (e.g. ["Mumbai", "Bombay"] or ["Bengaluru", "Bangalore"]).
    - Provide a list of 2-4 nearby cities, satellite towns, or major suburban cities in the same region (e.g. for Mumbai: ["Pune", "Navi Mumbai", "Thane", "Lonavala"]; for Delhi: ["Noida", "Gurugram", "Gurgaon", "Ghaziabad", "Faridabad"]). If no nearby major cities apply, return an empty array.
    
    CRITICAL TITLE SYNONYM CONSTRAINT:
    When generating alternate title synonyms for the Boolean search queries, you MUST keep them extremely tight and directly equivalent to the functional role. 
    - E.g. For "Visa Operations Manager", suitable synonyms are: "Visa Specialist", "Visa Expert", "Visa Ops Lead", "Visa Officer".
    - Do NOT generate broad, distant synonyms in adjacent fields (e.g. do NOT use "Global Mobility Team Lead", "Consular Services Specialist", or "Immigration Lead" unless explicitly specified in the JD). Keep synonyms closely focused on the core functional duties.
    
    INSTRUCTIONS FOR EXTRACTION & QUERY GENERATION:
       - ${instructionsText}
       ${freshnessInstruction}
       ${competitorInstruction}
       ${altTitlesInstruction}
       
    Return your response strictly in the JSON format specified in the schema.
  `;

  const response = await callGeminiWithRetry(() => client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          targetRole: { type: 'STRING' },
          skills: { type: 'ARRAY', items: { type: 'STRING' } },
          competitors: { type: 'ARRAY', items: { type: 'STRING' } },
          inferredCompetitors: { type: 'ARRAY', items: { type: 'STRING' } },
          booleanQueries: { type: 'ARRAY', items: { type: 'STRING' } },
          countryCode: { type: 'STRING' },
          citySynonyms: { type: 'ARRAY', items: { type: 'STRING' } },
          nearbyCities: { type: 'ARRAY', items: { type: 'STRING' } },
          countryName: { type: 'STRING' }
        },
        required: [
          'targetRole', 'skills', 'competitors', 'inferredCompetitors', 'booleanQueries',
          'countryCode', 'citySynonyms', 'nearbyCities', 'countryName'
        ]
      }
    }
  }));

  return JSON.parse(response.text);
}

export async function scoreAndEvaluateProspect(job, prospect, sagaType = 'Sourcing Saga') {
  const client = getAiClient();
  const environment = getEnvironment ? getEnvironment() : 'development';

  // Load custom scoring instructions from DB if available, fallback to defaults
  let scoringInstructions = DEFAULT_SCORING_INSTRUCTIONS;
  if (supabase) {
    try {
      const { data } = await supabase
        .from('sourcing_prompts')
        .select('instructions')
        .eq('prompt_type', 'candidate_scoring')
        .eq('environment', environment)
        .maybeSingle();
      if (data && data.instructions && data.instructions.length > 0) {
        scoringInstructions = data.instructions;
      }
    } catch (e) {
      console.warn(`[${sagaType}: Eval] ⚠️ Failed to fetch custom scoring prompts from DB, falling back to defaults:`, e.message);
    }
  }

  // Parse scoring weight configuration if present in instructions
  let weights = { "Location": 30, "Title": 30, "Experience": 20, "Skills": 20 };
  let parsedInstructions = [];

  scoringInstructions.forEach(inst => {
    if (inst.startsWith('SCORING_WEIGHTS:')) {
      try {
        const jsonStr = inst.substring('SCORING_WEIGHTS:'.length);
        weights = JSON.parse(jsonStr);
      } catch (e) {
        console.error(`[${sagaType}: Eval] ❌ Failed to parse SCORING_WEIGHTS instruction:`, e.message);
      }
    } else {
      parsedInstructions.push(inst);
    }
  });

  const factors = Object.keys(weights);
  const factorsText = factors.map(f => `- ${f}: Grade the candidate's alignment on this factor from 0 to 100 based on job requirements and candidate profile.`).join('\n');
  const instructionsText = parsedInstructions.map((inst, index) => `${index + 1}. ${inst}`).join('\n       - ');

  const realCompanyText = job.real_company_name ? `Hiring Company (Internal Use Only): ${job.real_company_name}\n` : '';
  const competitorsListStr = Array.isArray(job.competitors) ? job.competitors.join(', ') : '';
  const competitorsText = competitorsListStr ? `Known Direct Competitor Companies (Internal Use Only): ${competitorsListStr}\n` : '';
  const notesListStr = Array.isArray(job.notes) ? job.notes.join(', ') : job.notes || '';
  const notesText = notesListStr ? `Special Notes & Role Specifications: ${notesListStr}\n` : '';
  const responsibilitiesText = Array.isArray(job.responsibilities) ? JSON.stringify(job.responsibilities) : '[]';

  let scoringCompetitorInstruction = '';
  if (competitorsListStr) {
    scoringCompetitorInstruction = `
    
    CRITICAL COMPETITOR SCORING REQUIREMENT:
    Since this role is for the hiring company "${job.real_company_name || 'our company'}", we want to prioritize and target talent from these competitor companies: ${competitorsListStr}.
    If the candidate's latest company ("${prospect.latest_company || ''}") matches or is highly similar to any of these competitor company names, you MUST evaluate their background highly and grade their alignment on Experience and Skills favorably.
    `;
  }

  let scoringNotesInstruction = '';
  if (notesListStr) {
    scoringNotesInstruction = `
    
    CRITICAL SPECIAL NOTES & MANDATORY PREFERENCES:
    The employer has specified these mandatory/highly-preferred criteria: ${notesListStr}.
    You MUST strictly evaluate the candidate's profile against these special specifications. If they fail to meet a critical preference or requirement mentioned here (e.g. night shifts, immediate joiners, specific region/experience), reflect this explicitly in your match reasoning and reduce their score accordingly.
    `;
  }

  const prompt = `
    You are an expert technical recruiter. 
    Evaluate the suitability of the candidate prospect for the following Job Description (JD).
    
    --- JOB DETAILS ---
    Title: ${job.title}
    Location: ${job.location || 'Unknown'}
    Salary Range: ${job.salary || 'Not specified'}
    Benefits: ${Array.isArray(job.benefits) ? job.benefits.join(', ') : job.benefits || 'None specified'}
    ${realCompanyText}${competitorsText}${notesText}Target Experience: ${job.experience}
    About the Role: ${job.about_role}
    Key Responsibilities: ${responsibilitiesText}
    Requirements: ${JSON.stringify(job.requirements)}
    
    --- CANDIDATE PROSPECT DETAILS ---
    ${prospect.raw_payload?.comprehensive_profile ? prospect.raw_payload.comprehensive_profile : 
    `Name: ${prospect.name}
    Latest Title: ${prospect.latest_title}
    Latest Company: ${prospect.latest_company}
    Skills/Summary: ${prospect.skills || ''}
    Experience Summary: ${prospect.experience || ''}
    Location: ${prospect.city || 'Unknown'}`}
    
    --- REQUIRED DYNAMIC GRADING METRICS ---
    You MUST grade the candidate objectively on each of these active factors from 0 to 100:
    ${factorsText}
    
    INSTRUCTIONS FOR EVALUATION & SCORING:
       - ${instructionsText}
       ${scoringCompetitorInstruction}
       ${scoringNotesInstruction}
    
    Return your response strictly in the JSON format specified in the schema, detailing the scores array containing each factor name and its given grade.
  `;

  const response = await callGeminiWithRetry(() => client.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          scores: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                factorName: { type: 'STRING' },
                score: { type: 'INTEGER' }
              },
              required: ['factorName', 'score']
            }
          },
          aiReasoning: { type: 'STRING' },
          functionalField: { type: 'STRING' }
        },
        required: ['scores', 'aiReasoning', 'functionalField']
      }
    }
  }));

  const result = JSON.parse(response.text);

  // Calculate weighted average dynamically based on active UI configuration
  let totalWeightedScore = 0;
  let totalWeightSum = 0;
  
  const scoresMap = {};
  if (result.scores && Array.isArray(result.scores)) {
    result.scores.forEach(s => {
      if (s && s.factorName) {
        scoresMap[s.factorName.toLowerCase()] = s.score;
      }
    });
  }
  
  factors.forEach(f => {
    const score = typeof scoresMap[f.toLowerCase()] === 'number' ? scoresMap[f.toLowerCase()] : 50;
    const weight = weights[f];
    totalWeightedScore += score * weight;
    totalWeightSum += weight;
  });
  
  const matchScore = totalWeightSum > 0 ? Math.round(totalWeightedScore / totalWeightSum) : 50;

  return {
    matchScore,
    aiReasoning: result.aiReasoning,
    functionalField: result.functionalField,
    factorScores: result.scores
  };
}
