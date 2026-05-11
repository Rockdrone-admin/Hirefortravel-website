import LogoMarquee from './LogoMarquee';
import { logCritical } from '@repo/logger';

export default async function LogoShowcase() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  
  let logos = [];
  try {
    const res = await fetch(`${API_URL}/api/logos`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (data.success) {
      logos = data.data;
      if (logos.length === 0) {
        logCritical('Logos fetch succeeded but returned 0 logos. Check database.', { url: `${API_URL}/api/logos` });
      }
    } else {
      logCritical('API returned success:false when fetching logos', { data });
    }
  } catch (error) {
    logCritical('Failed to fetch logos from API (API might be down)', { error: error.message, url: `${API_URL}/api/logos` });
    console.error("Failed to fetch logos:", error);
  }

  // Fallback to static logos if API fails or DB is empty
  const defaultLogos = [
    { id: '1', logo_url: '/assets/images/StampMyVisa.svg', alt_text: 'StampMyVisa' },
    { id: '2', logo_url: '/assets/images/GoL-Travels.svg', alt_text: 'GoL Travels' },
    { id: '3', logo_url: '/assets/images/SortMyTrip.svg', alt_text: 'SortMyTrip' },
    { id: '4', logo_url: '/assets/images/Wondrr.svg', alt_text: 'Wondrr' },
    { id: '5', logo_url: '/assets/images/GoTravelo.svg', alt_text: 'GoTravelo' },
    { id: '6', logo_url: '/assets/images/Tripzana.svg', alt_text: 'Tripzana' }
  ];

  const displayLogos = logos.length > 0 ? logos : defaultLogos;

  return (
    <section className="section">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">Trusted by Travel Brands</span>
          <h2 className="section-title">Working with travel agencies, marketplaces, and operators across India.</h2>
          <p className="section-subtitle">Leading travel brands are hiring smarter and faster.</p>
        </div>

        <LogoMarquee logos={displayLogos} />
      </div>
    </section>
  );
}
