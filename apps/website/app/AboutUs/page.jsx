import LogoShowcase from '../components/LogoShowcase';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'About Us - HireForTravel | Recruitment Partner for Travel Industry',
  description: "We've worked across travel sales, operations, partnerships, and hiring - and built HireForTravel to solve hiring the right way.",
  openGraph: {
    title: 'About Us - HireForTravel | Recruitment Partner for Travel Industry',
    description: "We've worked across travel sales, operations, partnerships, and hiring - and built HireForTravel to solve hiring the right way.",
    images: ['/assets/images/og-cover.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Us - HireForTravel | Recruitment Partner for Travel Industry',
    description: "We've worked across travel sales, operations, partnerships, and hiring - and built HireForTravel to solve hiring the right way.",
    images: ['/assets/images/og-cover.png'],
  }
};

export default async function AboutUsPage() {
  return (
    <main>
      
        <section className="page-hero">
          <div className="container page-hero__panel">
            <span className="eyebrow">About Us</span>
            <h1>Built by People Who Understand the Travel Industry</h1>
            <p style={{ maxWidth: 'none' }}>We've worked across travel sales, operations, partnerships, and hiring - and built HireForTravel to solve hiring the right way.</p>
          </div>
        </section>

        <section className="section section--soft">
          <div className="container split-layout">
            <div>
              <div className="section-heading">
                <span className="eyebrow">Our Mission</span>
                <h2 className="section-title">To help travel companies hire faster with the right talent.</h2>
              </div>
              <p className="section-copy">
                And make it easier for candidates to find meaningful opportunities in the industry.
              </p>
            </div>
            <div className="panel">
              <p className="section-copy" style={{"marginTop": "0"}}>
                HireForTravel is designed to feel personal, responsive and useful from the first interaction. You'll likely
                speak directly with us.
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">Founders</span>
              <h2 className="section-title">Trusted conversations start with clear faces and real experience.</h2>
            </div>

            <div className="card-grid">
              <article className="founder-card">
                <img src="/assets/images/founder-shwetambri.webp" alt="Shwetambri Soni founder portrait placeholder" loading="lazy" />
                <div className="founder-card__content">
                  <h3>Shwetambri Soni</h3>
                  <span className="founder-role">Founder</span>
                  <ul className="bullet-list">
                    <li>8+ years of experience in HR, recruitment and client management.</li>
                    <li>Recruitment specialist focused on travel hiring.</li>
                    <li>Handles end-to-end hiring across sourcing, screening and closing roles.</li>
                    <li>Strong understanding of both candidate and company needs.</li>
                  </ul>
                  <a className="founder-link" href="https://www.linkedin.com/in/shwetambri-soni-b20791228/" target="_blank" rel="noopener">LinkedIn profile</a>
                </div>
              </article>

              <article className="founder-card">
                <img src="/assets/images/founder-charchit.webp" alt="Charchit Kumar co-founder portrait" loading="lazy" />
                <div className="founder-card__content">
                  <h3>Charchit Kumar</h3>
                  <span className="founder-role">Co-Founder</span>
                  <ul className="bullet-list">
                    <li>5+ years in the travel industry across supply, partnerships and operations.</li>
                    <li>Experience with global travel marketplaces and vendor ecosystems.</li>
                    <li>Expertise in B2B partnerships, negotiations and travel operations.</li>
                    <li>Worked on MICE, tours, supplier onboarding and cross-border deals.</li>
                  </ul>
                  <a className="founder-link" href="https://www.linkedin.com/in/charchitkumar/" target="_blank" rel="noopener">LinkedIn profile</a>
                </div>
              </article>
            </div>
          </div>
        </section>

        <LogoShowcase />

        <section className="section">
          <div className="container">
            <div className="cta-band">
              <h2>Looking to hire or exploring opportunities?</h2>
              <p>Choose the path that fits you.</p>
              <div className="button-row">
                <button className="button button--accent" type="button" data-open-modal="company">Hire Now</button>
                <button className="button button--secondary" type="button" data-open-modal="candidate">Apply to Opportunities</button>
              </div>
            </div>
          </div>
        </section>
      
    </main>
  );
}