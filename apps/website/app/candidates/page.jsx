import Link from 'next/link';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  const jobId = searchParams?.job;

  const defaultMeta = {
    title: 'Hiring Now | HireForTravel',
    description: 'Explore travel industry roles across operations, sales, visa, hospitality and more.',
    openGraph: {
      title: 'Hiring Now | HireForTravel',
      description: 'Explore travel industry roles across operations, sales, visa, hospitality and more.',
      images: ['/assets/images/og-cover.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Hiring Now | HireForTravel',
      description: 'Explore travel industry roles across operations, sales, visa, hospitality and more.',
      images: ['/assets/images/og-cover.png'],
    }
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
        const jobDesc = `Location: ${job.location} | Experience Required: ${job.experience} | Salary: ${job.salary || 'Competitive'}. Apply Now on HireForTravel.`;

        return {
          title: jobTitle,
          description: jobDesc,
          openGraph: {
            title: jobTitle,
            description: jobDesc,
            images: ['/assets/images/og-cover.png'],
          },
          twitter: {
            card: 'summary_large_image',
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

// Helper functions for Google Jobs Schema.org JSON-LD compatibility
function getSchemaDescription(job) {
  return [
    job.about_role,
    job.notes && job.notes.length > 0 ? `Please Note\n${job.notes.map(n => `- ${n}`).join('\n')}` : '',
    job.responsibilities && job.responsibilities.length > 0 ? `Key Responsibilities:\n${job.responsibilities.map(r => `- ${r}`).join('\n')}` : '',
    job.requirements && job.requirements.length > 0 ? `Requirements:\n${job.requirements.map(r => `- ${r}`).join('\n')}` : '',
    job.benefits && job.benefits.length > 0 ? `Benefits:\n${job.benefits.map(b => `- ${b}`).join('\n')}` : ''
  ].filter(Boolean).join('\n\n');
}

function getSchemaPostalAddress(location) {
  const loc = (location || '').trim().toLowerCase();
  
  let addressLocality = location || 'Delhi';
  let addressRegion = 'Delhi';
  let postalCode = '110001';
  let streetAddress = 'Not Specified';
  
  if (loc.includes('delhi') || loc.includes('ncr')) {
    addressLocality = 'Delhi';
    addressRegion = 'Delhi';
    postalCode = '110001';
  } else if (loc.includes('mumbai') || loc.includes('bombay')) {
    addressLocality = 'Mumbai';
    addressRegion = 'Maharashtra';
    postalCode = '400001';
  } else if (loc.includes('bangalore') || loc.includes('bengaluru')) {
    addressLocality = 'Bengaluru';
    addressRegion = 'Karnataka';
    postalCode = '560001';
  } else if (loc.includes('gurgaon') || loc.includes('gurugram')) {
    addressLocality = 'Gurugram';
    addressRegion = 'Haryana';
    postalCode = '122001';
  } else if (loc.includes('noida')) {
    addressLocality = 'Noida';
    addressRegion = 'Uttar Pradesh';
    postalCode = '201301';
  } else if (loc.includes('kolkata') || loc.includes('calcutta')) {
    addressLocality = 'Kolkata';
    addressRegion = 'West Bengal';
    postalCode = '700001';
  } else if (loc.includes('chennai') || loc.includes('madras')) {
    addressLocality = 'Chennai';
    addressRegion = 'Tamil Nadu';
    postalCode = '600001';
  } else if (loc.includes('pune')) {
    addressLocality = 'Pune';
    addressRegion = 'Maharashtra';
    postalCode = '411001';
  } else if (loc.includes('hyderabad')) {
    addressLocality = 'Hyderabad';
    addressRegion = 'Telangana';
    postalCode = '500001';
  } else if (loc.includes('remote') || loc.includes('work from home')) {
    addressLocality = 'Remote';
    addressRegion = 'Remote';
    postalCode = '000000';
  } else {
    addressLocality = location;
    addressRegion = location;
    postalCode = 'Not Specified';
  }

  return {
    "@type": "PostalAddress",
    "streetAddress": streetAddress,
    "addressLocality": addressLocality,
    "addressRegion": addressRegion,
    "postalCode": postalCode,
    "addressCountry": "IN"
  };
}

function getSchemaExperienceRequirements(expString) {
  const str = (expString || '').toLowerCase().trim();
  let years = 0;
  
  if (str.includes('fresher') || str.includes('0 years') || str.includes('no experience')) {
    years = 0;
  } else {
    const match = str.match(/(\d+)/);
    if (match) {
      years = parseInt(match[1], 10);
    }
  }

  return {
    "@type": "OccupationalExperienceRequirements",
    "monthsOfExperience": years * 12
  };
}

function getSchemaEmploymentType(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('intern')) return 'INTERN';
  if (t.includes('part-time') || t.includes('part time')) return 'PART_TIME';
  if (t.includes('contract') || t.includes('freelance')) return 'CONTRACTOR';
  return 'FULL_TIME';
}

function getSchemaBaseSalary(salaryString) {
  if (!salaryString) return undefined;
  
  const str = salaryString.replace(/,/g, '').toLowerCase();
  
  let unitText = 'YEAR';
  if (str.includes('month') || str.includes('pm') || str.includes('monthly')) {
    unitText = 'MONTH';
  }
  
  const numbers = str.match(/(\d[\d\.]*)/g);
  if (!numbers || numbers.length === 0) return undefined;
  
  let minVal = parseFloat(numbers[0]);
  let maxVal = numbers.length > 1 ? parseFloat(numbers[1]) : minVal;
  
  const isLPA = str.includes('lpa') || str.includes('lakh') || str.includes('lac');
  if (isLPA) {
    if (minVal < 50) minVal = minVal * 100000;
    if (maxVal < 50) maxVal = maxVal * 100000;
  }
  
  return {
    "@type": "MonetaryAmount",
    "currency": "INR",
    "value": {
      "@type": "QuantitativeValue",
      "minValue": minVal,
      "maxValue": maxVal,
      "unitText": unitText
    }
  };
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
    "itemListElement": jobs.map((job, index) => {
      const isRemote = (job.location || '').toLowerCase().includes('remote') || (job.location || '').toLowerCase().includes('work from home');
      const datePosted = job.created_at ? new Date(job.created_at) : new Date();
      const validThroughDate = new Date(datePosted);
      validThroughDate.setDate(validThroughDate.getDate() + 90);

      return {
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "JobPosting",
          "title": job.title,
          "description": getSchemaDescription(job),
          "hiringOrganization": {
            "@type": "Organization",
            "name": job.company_name
          },
          "jobLocation": isRemote ? undefined : {
            "@type": "Place",
            "address": getSchemaPostalAddress(job.location)
          },
          "jobLocationType": isRemote ? "TELECOMMUTE" : undefined,
          "applicantLocationRequirements": isRemote ? {
            "@type": "Country",
            "name": "IN"
          } : undefined,
          "employmentType": getSchemaEmploymentType(job.title),
          "baseSalary": getSchemaBaseSalary(job.salary),
          "experienceRequirements": getSchemaExperienceRequirements(job.experience),
          "totalJobOpenings": job.number_of_openings !== undefined && job.number_of_openings !== null ? Number(job.number_of_openings) : 1,
          "datePosted": datePosted.toISOString(),
          "validThrough": validThroughDate.toISOString()
        }
      };
    })
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
                    <div className="role-header-text">
                      <span className="role-title">{job.title}</span>
                      <span className="role-meta">Company: {job.company_name}</span>
                      <span className="role-meta">Location: {job.location}</span>
                      <span className="role-meta">Experience: {job.experience}</span>
                      {job.salary && <span className="role-meta">Salary: {job.salary}</span>}
                      {job.number_of_openings !== undefined && job.number_of_openings !== null && (
                        <span className="role-meta">Openings: {job.number_of_openings}</span>
                      )}
                    </div>
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
                    {job.about_role && (
                      <div className="role-section">
                        <h4>About The Role</h4>
                        <p className="role-text" style={{ whiteSpace: 'pre-line' }}>{job.about_role}</p>
                      </div>
                    )}

                    {job.notes && job.notes.length > 0 && (
                      <div className="role-section">
                        <h4>Please Note</h4>
                        <ul className="role-bullets">
                          {job.notes.map((note, i) => (
                            <li key={i}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}

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