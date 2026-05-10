export default function ContactUsPage() {
  return (
    <main>
      
        <section className="page-hero">
          <div className="container page-hero__panel">
            <span className="eyebrow">Contact Us</span>
            <h1>Talk to us the way that's easiest for you.</h1>
            <p style={{ maxWidth: 'none' }}>WhatsApp is fastest, email is always open, and the inquiry form below works for both companies and candidates.</p>
          </div>
        </section>

        <section className="section section--soft">
          <div className="container contact-grid">
            <div className="contact-methods">
              <article className="contact-card">
                <h3>Chat on WhatsApp</h3>
                <p>For quick hiring conversations or job application follow-ups.</p>
                <p><strong><a href="https://wa.me/919266788980?text=Hi%20Team%20HireForTravel%2C%0AI%20came%20across%20your%20platform%20and%20wanted%20to%20connect." target="_blank" rel="noopener">+91 92667 88980</a></strong></p>
                <div className="button-row">
                  <a className="button button--primary" href="https://wa.me/919266788980?text=Hi%20Team%20HireForTravel%2C%0AI%20came%20across%20your%20platform%20and%20wanted%20to%20connect." target="_blank" rel="noopener">Chat on WhatsApp</a>
                </div>
              </article>

              <article className="contact-card">
                <h3>Email</h3>
                <p>Share your requirement, resume or introduction via email.</p>
                <p><strong><a href="mailto:Contact@hirefortravel.com">Contact@hirefortravel.com</a></strong></p>
                <div className="button-row">
                  <a className="button button--secondary" href="mailto:Contact@hirefortravel.com">Send Email</a>
                </div>
              </article>

              <article className="contact-card">
                <h3>Prefer a guided form?</h3>
                <p>Use the dedicated lead popups for faster role-specific intake.</p>
                <div className="button-row">
                  <button className="button button--primary" type="button" data-open-modal="company">Hire Talent</button>
                  <button className="button button--secondary" type="button" data-open-modal="candidate">Apply Now</button>
                </div>
              </article>
            </div>
          </div>
        </section>
      
    </main>
  );
}