import { enrichWithApify } from './apify.js';
import { enrichWithBrightData } from './brightdata.js';

/**
 * Enriches a LinkedIn profile using the configured provider.
 * @param {string} linkedinUrl - The URL of the LinkedIn profile.
 * @param {string} serpSnippet - The Google SERP snippet used as a fallback.
 * @param {string} scraperChoice - The enrichment provider to use ('apify' or 'brightdata').
 */
export async function enrichLinkedInProfile(linkedinUrl, serpSnippet = '', scraperChoice = 'apify') {
  console.log(`[Sourcing Saga: Enrich] Using provider: ${scraperChoice}`);
  
  if (scraperChoice === 'brightdata') {
    return enrichWithBrightData(linkedinUrl, serpSnippet);
  } else {
    // Default to Apify
    return enrichWithApify(linkedinUrl, serpSnippet);
  }
}
