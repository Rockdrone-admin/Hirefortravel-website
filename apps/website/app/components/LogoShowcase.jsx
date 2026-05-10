export default async function LogoShowcase() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  
  let logos = [];
  try {
    const res = await fetch(`${API_URL}/api/logos`, { cache: 'no-store' });
    const data = await res.json();
    if (data.success) {
      logos = data.data;
    }
  } catch (error) {
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

        <div className="clients-strip" aria-label="Client logos">
          {displayLogos.map((logo) => (
            <div key={logo.id || logo.company_name} className="client-logo">
              <img src={logo.logo_url} alt={logo.alt_text || logo.company_name} loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
