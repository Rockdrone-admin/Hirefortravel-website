import LogoShowcase from '../components/LogoShowcase';

export default async function CompaniesPage() {
  return (
    <main>

      <section className="page-hero">
        <div className="container page-hero__panel">
          <span className="eyebrow">For Companies</span>
          <h1>Travel hiring support that keeps quality high and hiring cycles short.</h1>
          <p style={{ maxWidth: 'none' }}>
            We work closely with travel brands that need relevant, pre-screened talent without wasting time on broad
            and generic candidate pipelines.
          </p>
          <div className="button-row">
            <button className="button button--primary" type="button" data-open-modal="company">Hire Talent</button>
            <a className="button button--secondary" href="https://wa.me/919266788980?text=Hi%20Team%20HireForTravel%2C%20%0AI%E2%80%99m%20looking%20to%20hire%20candidates%20for%20our%20travel%20brand.%20Can%20you%20help%3F" target="_blank" rel="noopener">Chat on WhatsApp</a>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: '0', paddingBottom: '0', marginTop: '-1rem' }}>
        <div className="container">
          <div className="panel" style={{ padding: '2rem 2.35rem' }}>
            <div className="section-heading" style={{ maxWidth: 'none', textAlign: 'left', marginBottom: '1.5rem' }}>
              <h2 className="section-title" style={{ "fontSize": "2.2rem" }}>What you get</h2>
            </div>
            <ul className="list-clean grid-3">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                <span>Candidates who actually fit your role</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                <span>Profiles in your inbox within 24–48 hours</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                <span>We handle everything till the role is closed</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <LogoShowcase />

      <section className="section section--tight">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Who We Hire For</span>
            <h2 className="section-title">We specialize in hiring for travel brands across every major vertical.</h2>
            <p className="section-subtitle" >
              Clear focus, faster matching, and a better understanding of what each vertical actually needs.
            </p>
          </div>
          <div className="chip-list" aria-label="Travel sectors">
            <span className="chip">MICE</span>
            <span className="chip">Visa Processing</span>
            <span className="chip">Travel Agencies</span>
            <span className="chip">Tour Operators</span>
            <span className="chip">Airlines</span>
            <span className="chip">Flights / GDS</span>
            <span className="chip">Hotels</span>
            <span className="chip">Cruises</span>
            <span className="chip">Luxury Travel</span>
            <span className="chip">OTAs</span>
          </div>
        </div>
      </section>

      <section className="section section--soft">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Roles We Hire For</span>
            <h2 className="section-title">We help you build a great team across every core function.</h2>
          </div>
          <div className="grid-3">
            <article className="info-card">
              <h3>Commercial &amp; Sales</h3>
              <p>Travel sales, key account management, MICE sales teams, hotel sales and partnership roles.</p>
            </article>
            <article className="info-card">
              <h3>Operations</h3>
              <p>Travel operations, visa teams, ticketing, customer support and tour coordination.</p>
            </article>
            <article className="info-card">
              <h3>Supply &amp; Contracting</h3>
              <p>Supplier onboarding, contracting, destination sourcing, vendor management and cross-border partnerships.</p>
            </article>
            <article className="info-card">
              <h3>Hospitality &amp; Front Office</h3>
              <p>Front desk, reservations, guest experience, revenue support and hotel operations hiring.</p>
            </article>
            <article className="info-card">
              <h3>Marketing &amp; Growth</h3>
              <p>Travel marketing, content, retention, growth and brand roles.</p>
            </article>
            <article className="info-card">
              <h3>Finance, Tech &amp; Reruitment</h3>
              <p>Finance, reconciliation, recruitment support, product and tech-adjacent travel roles.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section section--soft">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">How It Works</span>
            <h2 className="section-title">A simple process designed to move from requirement to shortlist quickly.</h2>
          </div>

          <div className="process-grid">
            <article className="process-step">
              <div className="process-step__count">01</div>
              <h3>Share your requirement</h3>
              <p>Tell us the role, location, urgency and what good looks like for your team.</p>
            </article>
            <article className="process-step">
              <div className="process-step__count">02</div>
              <h3>We shortlist relevant candidates</h3>
              <p>We screen for fit, relevance and communication before profiles reach you.</p>
            </article>
            <article className="process-step">
              <div className="process-step__count">03</div>
              <h3>You interview and hire</h3>
              <p>We keep coordination simple so your hiring team can move faster with confidence.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section section--soft">
        <div className="container split-layout">
          <div>
            <div className="section-heading">
              <span className="eyebrow">Why Choose Us</span>
              <h2 className="section-title">We understand travel hiring from the inside out.</h2>
            </div>
            <ul className="list-clean">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                Founded by travel industry professionals who understand your hiring needs
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                Access to a strong network of industry-ready travel talent
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                Role-specific screening based on real industry experience
              </li>
            </ul>
          </div>
          <div className="panel">
            <h3>Need hiring support right away?</h3>
            <p>Share your requirement in under a minute.</p>
            <div className="button-row">
              <button className="button button--primary" type="button" data-open-modal="company">Hire Talent</button>
              <a className="button button--secondary" href="mailto:Contact@hirefortravel.com">Email Requirement</a>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}