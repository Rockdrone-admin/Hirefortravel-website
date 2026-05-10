import LogoShowcase from './components/LogoShowcase';

export default async function HomePage() {
  return (
    <main>

      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__copy">
            <h1>Hiring for Travel Industry - Fast, Curated &amp; Pre-Screened Talent</h1>
            <p>
              We help travel brands hire faster with curated, pre-screened talent across all core functions.
            </p>

            <div className="hero__actions">
              <button className="button button--primary" type="button" data-open-modal="company">Hire Talent</button>
              <button className="button button--secondary" type="button" data-open-modal="candidate">Apply for Opportunities</button>
            </div>

            <div className="hero__meta">
              <div className="metric-card">
                <strong>Travel-only focus</strong>
                <span>Sector understanding across B2B, leisure, OTA and hospitality teams.</span>
              </div>
              <div className="metric-card">
                <strong>Curated profiles</strong>
                <span>Pre-screened candidates to help you move faster and interview better.</span>
              </div>
              <div className="metric-card">
                <strong>Direct founders</strong>
                <span>You work with people who understand travel hiring and speak your language.</span>
              </div>
            </div>
          </div>

          <aside className="hero-card" aria-label="Why companies choose HireForTravel">
            <div className="hero-card__map">
              {/* Semi-Figurative Human Network Visual */}
              <svg viewBox="0 0 460 260" aria-hidden="true" className="route-map">
                <defs>
                  <filter id="hubGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <symbol id="person" viewBox="-10 -10 20 20">
                    <circle cx="0" cy="-4" r="3.5" />
                    <path d="M-7 7 C -7 2, -3 1, 0 1 C 3 1, 7 2, 7 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </symbol>
                </defs>

                {/* Background Connection Web */}
                <g opacity="0.06" stroke="white" strokeWidth="0.5" fill="none">
                  <circle cx="230" cy="130" r="160" />
                  <path d="M230 0 V260 M0 130 H460" />
                </g>

                {/* Network Connections to People */}
                <g stroke="#F4C542" strokeWidth="1" fill="none" opacity="0.3">
                  <path d="M230 130 Q 150 70 80 80" />
                  <path d="M230 130 Q 300 60 380 70" />
                  <path d="M230 130 Q 350 150 360 200" />
                  <path d="M230 130 Q 150 180 90 190" />
                  <path d="M230 130 Q 230 40 280 40" />
                  <path d="M230 130 Q 230 220 180 220" />
                  {/* Inter-person connections */}
                  <path d="M80 80 Q 50 130 90 190" strokeDasharray="3 3" opacity="0.5" />
                  <path d="M380 70 Q 420 130 360 200" strokeDasharray="3 3" opacity="0.5" />
                </g>

                {/* Central Brand Hub */}
                <circle cx="230" cy="130" r="10" fill="#F4C542" filter="url(#hubGlow)" />
                <circle cx="230" cy="130" r="18" stroke="#F4C542" strokeWidth="1" fill="none" opacity="0.4">
                  <animate attributeName="r" from="10" to="40" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.4" to="0" dur="3s" repeatCount="indefinite" />
                </circle>

                {/* Candidate Figurines (Gold - Primary) */}
                <g color="#F4C542">
                  <use href="#person" x="80" y="80" width="24" height="24" />
                  <use href="#person" x="380" y="70" width="26" height="26" />
                  <use href="#person" x="360" y="200" width="24" height="24" />
                  <use href="#person" x="90" y="190" width="22" height="22" />
                  <use href="#person" x="280" y="40" width="20" height="20" />
                  <use href="#person" x="180" y="220" width="20" height="20" />
                </g>

                {/* Secondary Candidate Network (White - Background) */}
                <g color="white" opacity="0.4">
                  <use href="#person" x="140" y="60" width="16" height="16" />
                  <use href="#person" x="320" y="100" width="16" height="16" />
                  <use href="#person" x="280" y="160" width="14" height="14" />
                  <use href="#person" x="150" y="140" width="14" height="14" />
                  <use href="#person" x="50" y="130" width="14" height="14" />
                  <use href="#person" x="410" y="140" width="14" height="14" />
                  <use href="#person" x="210" y="40" width="12" height="12" />
                  <use href="#person" x="340" y="40" width="12" height="12" />
                </g>
              </svg>
            </div>
            <div className="hero-card__list">
              <div className="hero-card__item">
                <div className="hero-card__icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12h16"></path>
                    <path d="m13 5 7 7-7 7"></path>
                  </svg>
                </div>
                <div>
                  <strong>Fast turnaround, with role-fit in mind</strong>
                  <span>Shortlists aligned to the realities of travel sales, operations and supplier-side hiring.</span>
                </div>
              </div>
              <div className="hero-card__item">
                <div className="hero-card__icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="5" width="16" height="14" rx="2"></rect>
                    <path d="M8 9h8"></path>
                    <path d="M8 13h5"></path>
                  </svg>
                </div>
                <div>
                  <strong>Built for travel industry, not generic databases</strong>
                  <span>MICE, visa, hotels, flights and GDS, luxury, cruises, OTAs, agencies and more.</span>
                </div>
              </div>
              <div className="hero-card__item">
                <div className="hero-card__icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v18"></path>
                    <path d="M3 12h18"></path>
                  </svg>
                </div>
                <div>
                  <strong>Travel Talent Network</strong>
                  <span>Strong network of candidates who understand the travel industry and are ready to contribute from day one.</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Who We Help</span>
            <h2 className="section-title">Hiring across the travel ecosystem.</h2>
            <p className="section-subtitle">
              Clear focus, faster matching, and a better understanding of what each vertical actually needs.
            </p>
          </div>
          <div className="chip-list" aria-label="Travel sectors">
            <span className="chip">MICE</span>
            <span className="chip">Visa Processing</span>
            <span className="chip">Travel Agencies</span>
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
            <span className="eyebrow">Why HireForTravel</span>
            <h2 className="section-title">Built to help travel companies hire with more clarity and less delay.</h2>
          </div>
          <div className="value-list">
            <div className="value-item">
              <strong>10+ years of combined founder experience</strong>
              <span>Grounded in travel operations, partnerships, hiring and client facing execution.</span>
            </div>
            <div className="value-item">
              <strong>Travel industry-focused hiring</strong>
              <span>We understand the nuance between a visa operations role and a supplier contracting role.</span>
            </div>
            <div className="value-item">
              <strong>Pre-screened, relevant candidates</strong>
              <span>You spend less time filtering and more time speaking to people who fit the role.</span>
            </div>
            <div className="value-item">
              <strong>Faster turnaround time</strong>
              <span>Lean process, direct communication, and less back-and-forth between requirement and shortlist.</span>
            </div>
            <div className="value-item">
              <strong>Strong network across travel domains</strong>
              <span>Sales• Operations • Supply and Contracting • Marketing • Finance • Front Desk • Tour Management • Customer Support • Recruitment • Visa Teams • Product and Tech • and more</span>
            </div>
          </div>
        </div>
      </section>

      <LogoShowcase />

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

      <section className="section">
        <div className="container">
          <div className="cta-band">
            <h2>Looking to hire?</h2>
            <p>Join the brands hiring smarter — get in touch now.</p>
            <div className="button-row">
              <button className="button button--accent" type="button" data-open-modal="company">Contact Us</button>
              <a className="button button--secondary" href="https://wa.me/919266788980?text=Hi%20Team%20HireForTravel%2C%20%0AI%E2%80%99m%20looking%20to%20hire%20candidates%20for%20our%20travel%20brand.%20Can%20you%20help%3F" target="_blank" rel="noopener">Chat on WhatsApp</a>
              <button className="button button--secondary" type="button" data-open-modal="candidate">Apply for Opportunities</button>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}