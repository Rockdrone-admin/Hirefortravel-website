import Link from 'next/link';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  const jobId = searchParams?.job;

  const defaultMeta = {
    title: 'Candidates | HireForTravel',
    description: 'Explore travel industry roles across operations, sales, visa, hospitality and more.',
  };

  if (!jobId) return defaultMeta;

  try {
    const res = await fetch(`${API_URL}/api/jobs`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (data.success) {
      const job = data.data.find(j => String(j.id) === String(jobId));
      if (job) {
        const jobTitle = `Hiring For: ${job.title} at ${job.company_name} | Apply Now`;
        const jobDesc = `Location: ${job.location} | Experience: ${job.experience} | Salary: ${job.salary || 'Competitive'}. Apply Now on HireForTravel.`;

        return {
          title: jobTitle,
          description: jobDesc,
          openGraph: {
            title: jobTitle,
            description: jobDesc,
            images: ['/assets/images/og-cover.png'],
          }
        };
      }
    }
  } catch (e) {
    console.error("Metadata fetch failed", e);
  }

  return defaultMeta;
}

export default async function CandidatesPage({ searchParams }) {
  const jobId = searchParams?.job;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  let jobs = [];
  try {
    // Fetch live jobs from our API (no-store ensures it never caches stale data)
    const res = await fetch(`${API_URL}/api/jobs`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (data.success) {
      jobs = data.data;
    }
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
  }

  // Generate automated Schema.org JSON-LD for Google Jobs indexing
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": jobs.map((job, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "JobPosting",
        "title": job.title,
        "hiringOrganization": {
          "@type": "Organization",
          "name": job.company_name
        },
        "jobLocation": {
          "@type": "Place",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": job.location
          }
        },
        "baseSalary": job.salary ? {
          "@type": "MonetaryAmount",
          "currency": "INR",
          "value": {
            "@type": "QuantitativeValue",
            "value": job.salary
          }
        } : undefined,
        "experienceRequirements": job.experience,
        "datePosted": job.created_at
      }
    }))
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="page-hero" style={{ "paddingBottom": "1.5rem" }}>
        <div className="container page-hero__panel">
          <span className="eyebrow">For Candidates</span>
          <h1>Hiring Now</h1>
          <p style={{ maxWidth: 'none' }}>
            Explore travel industry roles across operations, sales, visa, hospitality and more.
          </p>
          <div className="button-row">
            <button className="button button--primary" type="button" data-scroll-to="#current-roles">Apply for Opportunities</button>
            <a className="button button--secondary" href="https://wa.me/919266788980?text=Hi%20Team%20HireForTravel%2C%20%0AI%27m%20looking%20to%20apply%20for%20travel%20jobs.%20Are%20there%20any%20open%20positions%3F" target="_blank" rel="noopener">WhatsApp Your Profile</a>
          </div>
        </div>
      </section>

      <section id="current-roles" className="section section--soft" style={{ "paddingTop": "1.5rem" }}>
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Current Roles</span>
            <h2 className="section-title">Openings across the travel ecosystem.</h2>
            <p className="section-subtitle">Tap a role to see a quick summary, then apply in one step.</p>
          </div>

          <div className="roles-accordion">
            {jobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                <p>No open positions right now. Please check back later!</p>
              </div>
            ) : (
              jobs.map((job) => (
                <details key={job.id} id={`job-${job.id}`} className="role-panel" open={String(job.id) === String(jobId)}>
                  <summary>
                    <span>
                      <span className="role-title">{job.title}</span>
                      <span className="role-meta">Company: {job.company_name}</span>
                      <span className="role-meta">Location: {job.location}</span>
                      <span className="role-meta">Experience: {job.experience}</span>
                      {job.salary && <span className="role-meta">Salary: {job.salary}</span>}
                    </span>
                    <span className="role-summary-actions">
                      <button
                        className="button--share-inline"
                        type="button"
                        data-share-job={JSON.stringify({ id: job.id, title: job.title, company: job.company_name })}
                        title="Share Job"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                      </button>
                      <span className="plus-icon">+</span>
                    </span>
                  </summary>
                  <div className="role-panel__content">

                    {job.responsibilities && job.responsibilities.length > 0 && (
                      <div className="role-section">
                        <h4>Key Responsibilities</h4>
                        <ul className="role-bullets">
                          {job.responsibilities.map((req, i) => (
                            <li key={i}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {job.requirements && job.requirements.length > 0 && (
                      <div className="role-section">
                        <h4>Requirements</h4>
                        <ul className="role-bullets">
                          {job.requirements.map((req, i) => (
                            <li key={i}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {job.benefits && job.benefits.length > 0 && (
                      <div className="role-section">
                        <h4>Benefits</h4>
                        <ul className="role-bullets">
                          {job.benefits.map((ben, i) => (
                            <li key={i}>{ben}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="role-actions">
                      <button className="button button--primary" type="button" data-open-modal="candidate">Apply Now</button>
                    </div>
                  </div>
                </details>
              ))
            )}
          </div>

        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-band">
            <h2>Looking for your next travel role?</h2>
            <p>Share your current profile, preferred role and experience level. We'll reach out shortly if there's a fit.</p>
            <div className="button-row">
              <button className="button button--accent" type="button" data-open-modal="candidate">Apply Now</button>
              <a className="button button--secondary" href="mailto:Contact@hirefortravel.com?subject=Application%20for%20Travel%20Role">Email Your CV</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}