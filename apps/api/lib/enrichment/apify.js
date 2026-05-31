import { ApifyClient } from 'apify-client';
import { parseSerpSnippet } from './utils.js';

export async function enrichWithApify(linkedinUrl, serpSnippet = '') {
  const apiKey = process.env.APIFY_API_TOKEN;
  
  if (!linkedinUrl) {
    throw new Error('LinkedIn URL is required for enrichment');
  }

  console.log(`[Sourcing Saga: Enrich] Initiating Apify enrichment for URL: ${linkedinUrl}`);

  if (apiKey) {
    try {
      console.log(`[Sourcing Saga: Scraper] Scraping LinkedIn profile via Apify: ${linkedinUrl}`);
      
      const client = new ApifyClient({
          token: apiKey,
      });

      const input = {
          "profileScraperMode": "Profile details no email ($4 per 1k)",
          "queries": [
              linkedinUrl
          ]
      };

      const run = await client.actor("harvestapi~linkedin-profile-scraper").call(input);
      
      const { items } = await client.dataset(run.defaultDatasetId).listItems();

      if (items && items.length > 0) {
        let profile = items[0];
        const logTitle = (profile.currentPosition && profile.currentPosition.length > 0) ? profile.currentPosition[0].position : profile.headline;
        console.log(`[Sourcing Saga: Scraper] ✅ Apify scrape successful | Name: "${profile.firstName || ''} ${profile.lastName || ''}" | Title: "${logTitle || ''}"`);
        return cleanApifyPayload(profile, linkedinUrl, serpSnippet);
      } else {
        console.log(`[Sourcing Saga: Scraper] ⚠️ Apify scrape succeeded but returned 0 items.`);
      }
    } catch (err) {
      console.error(`[Sourcing Saga: Scraper] ❌ Exception during Apify profile scrape, falling back to SERP snippet:`, err.message);
    }
  } else {
    console.log(`[Sourcing Saga: Enrich] ⚠️ Apify API key is not configured. Falling back to SERP snippet parser.`);
  }

  console.log(`[Sourcing Saga: Enrich] ℹ️ Using fallback Google Snippet parser for: ${linkedinUrl}`);
  return parseSerpSnippet(linkedinUrl, serpSnippet);
}

function cleanApifyPayload(raw, linkedinUrl, serpSnippet = '') {
  const parsedSerp = parseSerpSnippet(linkedinUrl, serpSnippet);

  // 1. Name
  let name = `${raw.firstName || ''} ${raw.lastName || ''}`.trim();
  let nameFallbackUsed = false;
  if (!name && parsedSerp.name && parsedSerp.name !== 'LinkedIn Member' && parsedSerp.name !== 'Discovered Candidate') {
    name = parsedSerp.name;
    nameFallbackUsed = true;
    console.log(`[Sourcing Saga: Enrich] [Fallback] ℹ️ Name was missing from Apify. Used SERP fallback: "${name}"`);
  }
  if (!name) {
    name = parsedSerp.name || 'Discovered Candidate';
  }

  // 2. Latest Company
  let latestCompany = '';
  if (Array.isArray(raw.currentPosition) && raw.currentPosition.length > 0) {
    latestCompany = raw.currentPosition[0].companyName || '';
  }
  let companyFallbackUsed = false;
  if (!latestCompany && parsedSerp.latest_company) {
    latestCompany = parsedSerp.latest_company;
    companyFallbackUsed = true;
  }

  // 3. Latest Title
  let latestTitle = '';
  if (Array.isArray(raw.currentPosition) && raw.currentPosition.length > 0) {
    latestTitle = raw.currentPosition[0].position || '';
  }
  if (!latestTitle) {
      latestTitle = raw.headline || '';
  }
  let titleFallbackUsed = false;
  if (!latestTitle && parsedSerp.latest_title) {
    latestTitle = parsedSerp.latest_title;
    titleFallbackUsed = true;
  }

  // 4. City
  const city = raw.location?.parsed?.city || raw.location?.linkedinText || '';

  // 5. Total Experience (Apify doesn't natively return this, so leave blank or derive if needed)
  const totalExperience = '';

  // 6. Experience List
  let experienceList = Array.isArray(raw.experience) && raw.experience.length > 0
    ? raw.experience.slice(0, 3).map(exp => {
        const start = exp.startDate?.text || '';
        const end = exp.endDate?.text || 'Present';
        return `${exp.position || ''} at ${exp.companyName || ''} (${start} - ${end})`;
      }).join(', ')
    : '';

  if (!experienceList && Array.isArray(raw.currentPosition) && raw.currentPosition.length > 0) {
    experienceList = raw.currentPosition.map(pos => {
      const start = pos.startDate?.text || '';
      const end = pos.endDate?.text || 'Present';
      const dateStr = (start || end !== 'Present') ? ` (${start} - ${end})` : '';
      return `${pos.position || pos.positionName || ''} at ${pos.companyName || ''}${dateStr}`;
    }).join(', ');
    console.log(`[Sourcing Saga: Enrich] [Fallback] ℹ️ Experience missing from raw.experience. Falling back on raw.currentPosition: "${experienceList}"`);
  }

  if (!experienceList && parsedSerp.experience) {
    experienceList = parsedSerp.experience;
    console.log(`[Sourcing Saga: Enrich] [Fallback] ℹ️ Experience missing from Apify. Used SERP fallback: "${experienceList}"`);
  }

  // 7. Skills
  const skillsList = Array.isArray(raw.skills) 
    ? raw.skills.slice(0, 15).map(s => s.name || s).join(', ')
    : '';

  const finalConfidence = (nameFallbackUsed || titleFallbackUsed || companyFallbackUsed) ? 'medium' : 'high';

  // 8. Generate Comprehensive Markdown Profile
  let compProfile = `# Candidate Profile\n\n`;
  compProfile += `**Name:** ${name}\n`;
  compProfile += `**Headline:** ${raw.headline || ''}\n`;
  compProfile += `**Location:** ${city}\n`;
  if (raw.openToWork) compProfile += `**Status:** Open To Work\n`;
  
  if (raw.about) {
    compProfile += `\n## About\n${raw.about}\n`;
  }
  
  if (Array.isArray(raw.experience) && raw.experience.length > 0) {
    compProfile += `\n## Experience\n`;
    raw.experience.forEach(exp => {
      const start = exp.startDate?.text || '';
      const end = exp.endDate?.text || 'Present';
      compProfile += `### ${exp.position || 'Unknown Title'}\n`;
      compProfile += `**Company:** ${exp.companyName || 'Unknown Company'}\n`;
      compProfile += `**Duration:** ${start} - ${end}\n`;
      if (exp.location) compProfile += `**Location:** ${exp.location}\n`;
      if (exp.employmentType) compProfile += `**Type:** ${exp.employmentType}\n`;
      if (exp.description) compProfile += `\n${exp.description}\n`;
      compProfile += `\n`;
    });
  }
  
  if (Array.isArray(raw.education) && raw.education.length > 0) {
    compProfile += `\n## Education\n`;
    raw.education.forEach(edu => {
      const start = edu.startDate?.text || '';
      const end = edu.endDate?.text || '';
      const dateStr = (start || end) ? ` (${start} - ${end})` : '';
      compProfile += `- **${edu.schoolName || 'Unknown School'}**${dateStr}\n`;
      if (edu.degree || edu.fieldOfStudy) {
        compProfile += `  *${[edu.degree, edu.fieldOfStudy].filter(Boolean).join(' in ')}*\n`;
      }
    });
  }

  if (Array.isArray(raw.certifications) && raw.certifications.length > 0) {
    compProfile += `\n## Certifications\n`;
    raw.certifications.forEach(cert => {
      compProfile += `- **${cert.name || 'Unknown'}** (Issued by: ${cert.authority || 'Unknown'})\n`;
    });
  }

  if (Array.isArray(raw.projects) && raw.projects.length > 0) {
    compProfile += `\n## Projects\n`;
    raw.projects.forEach(proj => {
      compProfile += `### ${proj.title || 'Unknown Project'}\n`;
      if (proj.description) compProfile += `${proj.description}\n`;
    });
  }

  if (Array.isArray(raw.skills) && raw.skills.length > 0) {
    compProfile += `\n## Skills\n`;
    const skillNames = raw.skills.map(s => s.name || s);
    compProfile += skillNames.join(', ') + `\n`;
  }
  
  const extras = [];
  if (Array.isArray(raw.languages) && raw.languages.length > 0) extras.push(`**Languages:** ${raw.languages.map(l => l.name || l.title || l).join(', ')}`);
  if (Array.isArray(raw.honorsAndAwards) && raw.honorsAndAwards.length > 0) extras.push(`**Honors & Awards:** ${raw.honorsAndAwards.length} items`);
  if (Array.isArray(raw.publications) && raw.publications.length > 0) extras.push(`**Publications:** ${raw.publications.length} items`);
  if (Array.isArray(raw.courses) && raw.courses.length > 0) extras.push(`**Courses:** ${raw.courses.length} items`);
  if (Array.isArray(raw.volunteering) && raw.volunteering.length > 0) extras.push(`**Volunteering:** ${raw.volunteering.length} roles`);
  
  if (extras.length > 0) {
    compProfile += `\n## Additional Info\n`;
    compProfile += extras.map(e => `- ${e}`).join('\n') + `\n`;
  }

  // 9. Extract and render detailed recommendation text content
  const parsedRecommendations = [];
  if (Array.isArray(raw.receivedRecommendations) && raw.receivedRecommendations.length > 0) {
    compProfile += `\n## Recommendations Received (${raw.receivedRecommendations.length})\n`;
    raw.receivedRecommendations.forEach((rec, idx) => {
      if (rec.description) {
        const givenBy = rec.givenByHeadline || 'LinkedIn Professional';
        const dateContext = rec.givenAt || '';
        
        compProfile += `### Recommendation ${idx + 1}\n`;
        if (dateContext) compProfile += `**Date/Context:** ${dateContext}\n`;
        compProfile += `**Given By:** ${givenBy}\n\n`;
        compProfile += `> ${rec.description.trim().replace(/\n/g, '\n> ')}\n\n`;
        
        parsedRecommendations.push({
          givenBy,
          date: dateContext,
          text: rec.description.trim()
        });
      }
    });
  }

  return {
    name,
    email: null,
    phone: null,
    city,
    latest_title: latestTitle,
    latest_company: latestCompany,
    total_experience: totalExperience,
    linkedin_url: linkedinUrl,
    skills: skillsList,
    experience: experienceList,
    enrichment_confidence: finalConfidence,
    raw_payload: {
      comprehensive_profile: compProfile,
      skills: raw.skills ? raw.skills.slice(0, 10).map(s => s.name || s) : [],
      experience: (raw.experience && raw.experience.length > 0)
        ? raw.experience.slice(0, 3).map(exp => ({
            title: exp.position,
            company: exp.companyName
          }))
        : (raw.currentPosition && raw.currentPosition.length > 0)
          ? raw.currentPosition.map(pos => ({
              title: pos.position || pos.positionName,
              company: pos.companyName
            }))
          : [],
      summary: raw.about || '',
      recommendations: parsedRecommendations
    }
  };
}
