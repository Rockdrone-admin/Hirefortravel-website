# HireForTravel Static Site

Lightweight static frontend for Vercel with clean folder-based routes:

- `/`
- `/companies`
- `/candidates`
- `/AboutUs`
- `/ContactUs`

## Update webhook destination

Edit [assets/js/config.js](/D:/HireForTravel%20Website/assets/js/config.js) and replace:

- `webhookUrl`

with your deployed Google Apps Script, Formspree, or Sheet.best endpoint.

The forms submit JSON with:

- `timestamp`
- `source`
- `pageUrl`
- `cta`
- all visible form fields

## Deploy

1. Push this folder to a Git repository.
2. Import the repo into Vercel.
3. Deploy as a static site.

No backend setup is required unless you want live lead storage, in which case only the webhook URL needs to be updated.
