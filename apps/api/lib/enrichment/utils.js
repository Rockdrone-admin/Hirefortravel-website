/**
 * Parses the Google Search Result snippet to extract Name, Title, and Company.
 */
export function parseSerpSnippet(linkedinUrl, snippet) {
  if (!snippet) {
    return {
      name: 'LinkedIn Member',
      email: null,
      phone: null,
      city: '',
      latest_title: '',
      latest_company: '',
      total_experience: '',
      linkedin_url: linkedinUrl,
      skills: '',
      experience: '',
      enrichment_confidence: 'low',
      raw_payload: {}
    };
  }

  // E.g. snippet: "Rahul Sharma - Senior Visa Consultant - Atlys | LinkedIn..."
  const parts = snippet.split(' - ').map(p => p.trim());
  const name = parts[0] || 'LinkedIn Member';
  const latestTitle = parts[1] || '';
  
  // Try to parse company
  let latestCompany = '';
  if (parts[2]) {
    latestCompany = parts[2].split('|')[0].trim();
  }

  return {
    name,
    email: null,
    phone: null,
    city: '',
    latest_title: latestTitle,
    latest_company: latestCompany,
    total_experience: '',
    linkedin_url: linkedinUrl,
    skills: '',
    experience: snippet,
    enrichment_confidence: 'low',
    raw_payload: {
      comprehensive_profile: generateFallbackComprehensiveProfile(name, latestTitle, latestCompany, snippet, linkedinUrl)
    }
  };
}

/**
 * Generates a basic markdown profile when only a SERP snippet or sparse data is available.
 */
export function generateFallbackComprehensiveProfile(name, title, company, snippet, url) {
  let profile = `# Candidate Profile (Sparse/Fallback)\n\n`;
  profile += `**Name:** ${name || 'Unknown'}\n`;
  profile += `**Headline / Title:** ${title || 'Unknown'}\n`;
  profile += `**Latest Company:** ${company || 'Unknown'}\n`;
  profile += `**LinkedIn URL:** ${url}\n\n`;
  
  if (snippet) {
    profile += `## Search Snippet Summary\n`;
    profile += `> ${snippet}\n\n`;
    profile += `*Note: Detailed profile data (experience, education, skills) could not be retrieved from the provider. Evaluate based on the available snippet.*`;
  }
  
  return profile;
}
