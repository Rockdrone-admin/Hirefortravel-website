import './globals.css';
import Script from 'next/script';

export const metadata = {
  title: 'HireForTravel | Travel Recruitment Agency',
  description: 'HireForTravel helps travel brands hire faster.',
  openGraph: {
    images: ['/assets/images/og-cover.png'],
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Roboto:wght@500;700;900&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        {/* Google Analytics */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-HEZ2QPE3J7" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-HEZ2QPE3J7');
          `}
        </Script>
      </head>
      <body>
        <div className="page-shell">
          <header className="site-header">
        <div className="container site-header__inner">
          <a className="brand" href="/">
            <img src="/assets/images/logo-mark.svg" alt="HireForTravel logo" width="42" height="42" />
            <span className="brand__text">
              <span className="brand__name">
                HireFor<span className="brand__highlight">Travel</span>
              </span>
              <span className="brand__tag">Travel Hiring Specialists</span>
            </span>
          </a>

          <button className="nav-toggle" type="button" aria-expanded="false" data-nav-toggle>
            <span className="sr-only">Toggle menu</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 7h16"></path>
              <path d="M4 12h16"></path>
              <path d="M4 17h16"></path>
            </svg>
          </button>

          <nav className="nav" data-mobile-nav>
            <div className="nav__links">
              <a data-nav-link href="/">Home</a>
              <a data-nav-link href="/companies">Companies</a>
              <a data-nav-link href="/candidates">Candidates</a>
              <a data-nav-link href="/AboutUs">About Us</a>
              <a data-nav-link href="/ContactUs">Contact</a>
            </div>
            <div className="nav__actions">
              <a className="button button--secondary" href="mailto:Contact@hirefortravel.com">Email Us</a>
              <button className="button button--primary" type="button" data-open-modal="company">Hire Talent</button>
            </div>
          </nav>
        </div>
      </header>
          {children}
          <footer className="site-footer">
        <div className="container">
          <div className="site-footer__grid">
            <div>
              <a className="brand" href="/" aria-label="HireForTravel home">
                <img src="/assets/images/logo-mark.svg" alt="" width="42" height="42" />
                <span className="brand__text">
                  <span className="brand__name">
                    HireFor<span className="brand__highlight">Travel</span>
                  </span>
                  <span className="brand__tag" style={{"color": "rgba(255,255,255,.62)"}}>Travel Hiring Specialists</span>
                </span>
              </a>
              <p>Fast, focused recruitment for travel brands hiring across operations, sales, supply, visa, hospitality and more.</p>
            </div>
            <div>
              <h3>Navigate</h3>
              <div className="footer-nav">
                <a href="/companies">Companies</a>
                <a href="/candidates">Candidates</a>
                <a href="/AboutUs">About Us</a>
                <a href="/ContactUs">Contact Us</a>
              </div>
            </div>
            <div>
              <h3>Contact</h3>
              <p><a href="tel:+919266788980">+91 92667 88980</a></p>
              <p><a href="mailto:Contact@hirefortravel.com">Contact@hirefortravel.com</a></p>
              <p><a href="https://wa.me/919266788980?text=Hi%20Team%20HireForTravel%2C%20%0AI%E2%80%99m%20looking%20to%20hire%20candidates%20for%20our%20travel%20brand.%20Can%20you%20help%3F" target="_blank" rel="noopener">WhatsApp us</a></p>
            </div>
          </div>
          <div className="footer-bottom">
            <span>Copyright <span data-current-year></span> HireForTravel. All rights reserved.</span>
            <span>Focused on trust, speed and conversion for travel hiring.</span>
          </div>
        </div>
      </footer>
          <a className="sticky-whatsapp" href="https://wa.me/919266788980?text=Hi%20Team%20HireForTravel%2C%20%0AI%E2%80%99m%20looking%20to%20hire%20candidates%20for%20our%20travel%20brand.%20Can%20you%20help%3F" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
          <path d="M19.05 4.94A9.87 9.87 0 0 0 12.03 2C6.52 2 2.04 6.48 2.04 11.99c0 1.76.46 3.48 1.33 5L2 22l5.16-1.35a10 10 0 0 0 4.82 1.23h.01c5.51 0 9.99-4.48 10-9.99a9.92 9.92 0 0 0-2.94-6.95ZM12 20.2h-.01a8.27 8.27 0 0 1-4.22-1.15l-.3-.18-3.06.8.82-2.98-.2-.31a8.22 8.22 0 0 1-1.27-4.4c0-4.56 3.71-8.27 8.27-8.27 2.2 0 4.27.86 5.82 2.42a8.2 8.2 0 0 1 2.41 5.85c0 4.56-3.71 8.27-8.26 8.27Zm4.53-6.2c-.25-.13-1.47-.73-1.69-.82-.23-.08-.4-.12-.57.13-.16.24-.65.82-.8.99-.15.16-.29.18-.54.06-.25-.13-1.06-.39-2.02-1.25-.74-.66-1.25-1.48-1.4-1.72-.15-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.44-.06-.12-.57-1.37-.78-1.88-.21-.5-.43-.43-.58-.44h-.49c-.16 0-.44.06-.66.31-.23.25-.87.85-.87 2.07s.9 2.4 1.03 2.56c.12.16 1.76 2.69 4.27 3.77.59.26 1.06.41 1.42.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.67-1.19.21-.59.21-1.09.14-1.19-.06-.1-.23-.16-.48-.29Z"/>
        </svg>
        <span>WhatsApp Now</span>
      </a>
        </div>
        <Script 
          id="api-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.HFT_API_URL = "${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}";`
          }}
        />
        <Script src="/assets/js/config.js" strategy="beforeInteractive" />
        <Script src="/assets/js/site.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
