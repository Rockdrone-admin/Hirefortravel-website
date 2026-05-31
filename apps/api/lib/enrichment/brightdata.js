import { parseSerpSnippet, generateFallbackComprehensiveProfile } from './utils.js';

/**
 * Wrapper for Bright Data LinkedIn Profile Scraper API.
 * Includes a robust fallback parser that extracts info from Google SERP snippets if scraping fails.
 */
export async function enrichWithBrightData(linkedinUrl, serpSnippet = '') {
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  
  if (!linkedinUrl) {
    throw new Error('LinkedIn URL is required for enrichment');
  }

  console.log(`[Sourcing Saga: Enrich] Initiating profile enrichment for URL: ${linkedinUrl}`);

  // 1. If Bright Data key is configured, attempt scraping
  if (apiKey) {
    try {
      console.log(`[Sourcing Saga: Scraper] Scraping LinkedIn profile via Bright Data: ${linkedinUrl}`);
      
      const scrapeResponse = await fetch('https://api.brightdata.com/datasets/v3/scrape?dataset_id=gd_l1viktl72bvl7bjuj0&notify=false&include_errors=true', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: [{ url: linkedinUrl }]
        })
      });

      console.log(`[Sourcing Saga: Scraper] Response: HTTP ${scrapeResponse.status} ${scrapeResponse.statusText}`);

      if (scrapeResponse.ok && scrapeResponse.status !== 202) {
        const text = await scrapeResponse.text();
        let parsed = JSON.parse(text);
        let profile = parsed;
        
        if (Array.isArray(parsed)) {
          profile = parsed[0];
        }

        if (profile) {
          const currentCompanyName = profile.current_company?.name || profile.current_company_name || '';
          const currentJobTitle = profile.current_company?.title || profile.current_job?.title || '';
          console.log(`[Sourcing Saga: Scraper] ✅ Scrape successful | Name: "${profile.name || profile.full_name || 'N/A'}" | Title: "${currentJobTitle}" | Company: "${currentCompanyName}" | Location: "${profile.city || profile.location || 'N/A'}"`);
          return cleanBrightDataPayload(profile, linkedinUrl, serpSnippet);
        } else {
          console.log(`[Sourcing Saga: Scraper] ⚠️ Scrape succeeded but profile object was empty/null.`);
        }
      } else if (scrapeResponse.status === 202) {
        console.warn(`[Sourcing Saga: Scraper] ⚠️ Direct-scrape returned 202 Accepted (Async processing required). Falling back to Google SERP snippet.`);
      } else {
        const errText = await scrapeResponse.text().catch(() => 'unknown error text');
        console.error(`[Sourcing Saga: Scraper] ❌ Scrape request failed | Status: ${scrapeResponse.status} | Error payload:`, errText);
      }
    } catch (err) {
      console.error(`[Sourcing Saga: Scraper] ❌ Exception during Bright Data profile scrape, falling back to SERP snippet:`, err.message);
    }
  } else {
    console.log(`[Sourcing Saga: Enrich] ⚠️ Bright Data API key is not configured. Falling back to SERP snippet parser.`);
  }

  // 2. Resilient fallback parsing using Google Search Snippet
  console.log(`[Sourcing Saga: Enrich] ℹ️ Using fallback Google Snippet parser for: ${linkedinUrl}`);
  return parseSerpSnippet(linkedinUrl, serpSnippet);
}

/**
 * Clean and slim down the Bright Data payload to prevent database bloat.
 */
function cleanBrightDataPayload(raw, linkedinUrl, serpSnippet = '') {
  // Pre-parse the SERP snippet for robust per-field fallbacks
  const parsedSerp = parseSerpSnippet(linkedinUrl, serpSnippet);

  // 1. Name Fallback Check
  let name = raw.name || raw.full_name || '';
  let nameFallbackUsed = false;
  if (!name && parsedSerp.name && parsedSerp.name !== 'LinkedIn Member' && parsedSerp.name !== 'Discovered Candidate') {
    name = parsedSerp.name;
    nameFallbackUsed = true;
    console.log(`[Sourcing Saga: Enrich] [Fallback] ℹ️ Name was missing from scraped data. Used SERP fallback: "${name}"`);
  }
  if (!name) {
    name = parsedSerp.name || 'Discovered Candidate';
  }

  // 2. Latest Company Fallback Check
  let latestCompany = raw.current_company?.name || raw.current_company_name || '';
  if (!latestCompany && Array.isArray(raw.experience) && raw.experience.length > 0) {
    latestCompany = raw.experience[0].company || '';
  }
  let companyFallbackUsed = false;
  if (!latestCompany && parsedSerp.latest_company) {
    latestCompany = parsedSerp.latest_company;
    companyFallbackUsed = true;
    console.log(`[Sourcing Saga: Enrich] [Fallback] ℹ️ Company was missing from scraped data. Used SERP fallback: "${latestCompany}"`);
  }

  // 3. Latest Title Fallback Check
  let latestTitle = raw.current_company?.title || raw.position || raw.current_job?.title || raw.current_job_title || '';
  if (!latestTitle && Array.isArray(raw.experience) && raw.experience.length > 0) {
    latestTitle = raw.experience[0].title || '';
  }
  let titleFallbackUsed = false;
  if (!latestTitle && parsedSerp.latest_title) {
    latestTitle = parsedSerp.latest_title;
    titleFallbackUsed = true;
    console.log(`[Sourcing Saga: Enrich] [Fallback] ℹ️ Title was missing from scraped data. Used SERP fallback: "${latestTitle}"`);
  }

  // 4. City/Location Check
  const cityVal = raw.location || raw.city || '';
  const city = typeof cityVal === 'object' ? (cityVal.city || '') : cityVal;
  
  // 5. Total Experience Check
  const totalExperience = raw.total_experience || '';
  
  // 6. Experience List Fallback Check
  let experienceList = Array.isArray(raw.experience) 
    ? raw.experience.slice(0, 3).map(exp => `${exp.title || ''} at ${exp.company || ''} (${exp.start_date || ''} - ${exp.end_date || 'Present'})`).join(', ')
    : '';
  let expFallbackUsed = false;
  if (!experienceList && parsedSerp.experience) {
    experienceList = parsedSerp.experience;
    expFallbackUsed = true;
    console.log(`[Sourcing Saga: Enrich] [Fallback] ℹ️ Experience details missing from scraped data. Used SERP fallback: "${experienceList}"`);
  }

  const skillsList = Array.isArray(raw.skills) 
    ? raw.skills.slice(0, 15).join(', ')
    : '';

  const finalConfidence = (nameFallbackUsed || titleFallbackUsed || companyFallbackUsed) ? 'medium' : 'high';
  console.log(`[Sourcing Saga: Enrich] ✅ Enriched Profile Data | Name: "${name}" | Title: "${latestTitle}" | Company: "${latestCompany}" | City: "${city}" | Confidence: ${finalConfidence}`);

  // Generate Comprehensive Markdown Profile
  let compProfile = `# Candidate Profile\n\n`;
  compProfile += `**Name:** ${name}\n`;
  compProfile += `**Headline:** ${raw.headline || raw.position || ''}\n`;
  compProfile += `**Location:** ${city}\n`;
  
  const summary = raw.summary || raw.about || '';
  if (summary) {
    compProfile += `\n## About\n${summary}\n`;
  }
  
  if (Array.isArray(raw.experience) && raw.experience.length > 0) {
    compProfile += `\n## Experience\n`;
    raw.experience.forEach(exp => {
      compProfile += `### ${exp.title || 'Unknown Title'}\n`;
      compProfile += `**Company:** ${exp.company || 'Unknown Company'}\n`;
      compProfile += `**Duration:** ${exp.start_date || ''} - ${exp.end_date || 'Present'}\n`;
      if (exp.location) compProfile += `**Location:** ${exp.location}\n`;
      if (exp.description) compProfile += `\n${exp.description}\n`;
      compProfile += `\n`;
    });
  } else if (parsedSerp.experience) {
    compProfile += `\n## Experience Snippet\n> ${parsedSerp.experience}\n`;
  }
  
  if (Array.isArray(raw.education) && raw.education.length > 0) {
    compProfile += `\n## Education\n`;
    raw.education.forEach(edu => {
      compProfile += `- **${edu.school || edu.school_name || 'Unknown School'}** (${edu.start_date || ''} - ${edu.end_date || ''})\n`;
      if (edu.degree || edu.field_of_study) {
        compProfile += `  *${[edu.degree, edu.field_of_study].filter(Boolean).join(' in ')}*\n`;
      }
    });
  }

  if (Array.isArray(raw.skills) && raw.skills.length > 0) {
    compProfile += `\n## Skills\n`;
    compProfile += raw.skills.join(', ') + `\n`;
  }

  return {
    name,
    email: raw.email || null,
    phone: raw.phone || null,
    city,
    latest_title: latestTitle,
    latest_company: latestCompany,
    total_experience: totalExperience,
    linkedin_url: linkedinUrl,
    skills: skillsList,
    experience: experienceList,
    enrichment_confidence: finalConfidence,
    raw_payload: {
      comprehensive_profile: compProfile || generateFallbackComprehensiveProfile(name, latestTitle, latestCompany, serpSnippet, linkedinUrl),
      skills: raw.skills ? raw.skills.slice(0, 10) : [],
      experience: raw.experience ? raw.experience.slice(0, 3) : [],
      summary
    }
  };
}

