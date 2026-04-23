const BETTERSTACK_TOKEN = "wBYGCzXtf9Q1hJ8V6KYzoWVe";
const BETTERSTACK_ENDPOINT = "https://in.logs.betterstack.com/v1/logs";

// Send log to BetterStack
async function sendToBetterStack(level, step, message, data) {
  try {
    const payload = {
      level,
      dt: new Date().toISOString(),
      step,
      message,
      data: data || {},
      source: "vercel-api"
    };

    const response = await fetch(BETTERSTACK_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BETTERSTACK_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.warn(`BetterStack log failed: ${response.status}`);
    }
  } catch (error) {
    console.error("BetterStack error:", error.message);
  }
}

// Debug helper - logs to both console and BetterStack
async function debugLog(step, message, data) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${step}: ${message}`;
  
  // Log to Vercel console
  console.log(logEntry);
  if (data !== undefined) {
    console.log("  📦 Data:", data);
  }
  
  // Determine log level
  let level = "info";
  if (message.includes("ERROR") || message.includes("❌")) {
    level = "error";
  } else if (message.includes("⚠️")) {
    level = "warning";
  }
  
  // Send to BetterStack
  await sendToBetterStack(level, step, message, data);
}

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
    await debugLog("handler", "✅ Preflight request handled");
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    await debugLog("handler", "❌ Invalid method: " + req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await debugLog("handler", "🔄 NEW REQUEST - Form submission received", { 
      bodySize: JSON.stringify(req.body).length,
      bodyKeys: Object.keys(req.body).join(", ")
    });

    const googleAppsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL || 
      'https://script.google.com/macros/s/AKfycbyV-6D_X5Q2Eixtn2Eln0z19E1ABK0dJi9-ANF-51W3w5_ZysOP20lXoSI9kDWMe34dxQ/exec';

    await debugLog("handler", "Step 1: Forwarding to AppScript", { 
      appscriptUrl: googleAppsScriptUrl,
      payloadSource: req.body.source 
    });

    // Forward the request to Google Apps Script
    const response = await fetch(googleAppsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    await debugLog("handler", "Step 2: Response received from AppScript", {
      status: response.status,
      statusText: response.statusText
    });

    const data = await response.json();
    
    await debugLog("handler", "Step 3: Response parsed", {
      success: data.success,
      error: data.error || "none",
      warning: data.warning || "none"
    });

    if (!response.ok) {
      await debugLog("handler", "❌ AppScript returned error", { 
        status: response.status,
        data: data 
      });
      return res.status(response.status).json({ 
        success: false, 
        message: 'AppScript returned error',
        data 
      });
    }
    
    await debugLog("handler", "✅ SUCCESS - Form submitted", { 
      success: true,
      warning: data.warning || "none"
    });

    // Return success response to the client
    return res.status(200).json({ 
      success: true, 
      message: 'Form submitted successfully',
      data 
    });

  } catch (error) {
    await debugLog("handler", "❌ ERROR", { 
      error: error.message,
      stack: error.stack?.split("\n").slice(0, 3).join(" | ")
    });

    console.error('Form submission error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to submit form',
      error: error.message 
    });
  }
}
