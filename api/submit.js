export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const googleAppsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL || 
      'https://script.google.com/macros/s/AKfycbyV-6D_X5Q2Eixtn2Eln0z19E1ABK0dJi9-ANF-51W3w5_ZysOP20lXoSI9kDWMe34dxQ/exec';

    // Forward the request to Google Apps Script
    const response = await fetch(googleAppsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    
    // Return success response to the client
    return res.status(200).json({ 
      success: true, 
      message: 'Form submitted successfully',
      data 
    });
  } catch (error) {
    console.error('Form submission error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to submit form',
      error: error.message 
    });
  }
}
