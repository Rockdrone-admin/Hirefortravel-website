const BETTERSTACK_TOKEN = "wBYGCzXtf9Q1hJ8V6KYzoWVe";
const BETTERSTACK_ENDPOINT = "https://in.logs.betterstack.com/v1/logs";
const GENERIC_FORM_ERROR = "Something went wrong! Please connect with us directly over Whatsapp.";

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

// Fire-and-forget logging (non-blocking)
function logAsync(step, message, data) {
  // Don't await - let it run in background
  debugLog(step, message, data).catch(err => {
    console.error("Logging error:", err.message);
  });
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
    logAsync("handler", "✅ Preflight request handled");
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    logAsync("handler", "❌ Invalid method: " + req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log asynchronously (non-blocking)
    logAsync("handler", "🔄 NEW REQUEST - Form submission received", {
      bodySize: JSON.stringify(req.body).length,
      bodyKeys: Object.keys(req.body).join(", ")
    });

    // === CRITICAL VALIDATION: Verify all filled fields are present ===
    const source = req.body.source || "Contact";

    // System/metadata fields to exclude from validation
    const systemFields = ['timestamp', 'pageUrl', 'originPage', 'source', 'cta'];

    // Get all fields submitted (excluding system fields and file data)
    const submittedFields = Object.entries(req.body)
      .filter(([key, value]) => {
        // Exclude system fields
        if (systemFields.includes(key)) return false;
        // Exclude base64 file data fields
        if (key.endsWith('Data') || key.endsWith('Name')) return false;
        // Include fields that have values
        return value !== null && value !== undefined && String(value).trim() !== '';
      });

    // Ensure at least some contact information is present
    const hasEmail = req.body.email && String(req.body.email).trim() !== '';
    const hasPhone = req.body.phoneNumber && String(req.body.phoneNumber).trim() !== '';

    if (!hasEmail && !hasPhone) {
      throw new Error('At least email or phone number is required');
    }

    // Validate all submitted fields are non-empty
    for (const [field, value] of submittedFields) {
      if (!value || String(value).trim() === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    logAsync("handler", "✅ Critical validation passed", {
      source,
      submittedFields: submittedFields.map(([field]) => field)
    });

    // === PRIORITY: Send to Google Apps Script (team receives data) ===
    const googleAppsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL ||
      'https://script.google.com/macros/s/AKfycbyV-6D_X5Q2Eixtn2Eln0z19E1ABK0dJi9-ANF-51W3w5_ZysOP20lXoSI9kDWMe34dxQ/exec';

    logAsync("handler", "Step 1: Forwarding to AppScript", {
      appscriptUrl: googleAppsScriptUrl,
      payloadSource: source
    });

    const appScriptResponse = await fetch(googleAppsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    logAsync("handler", "Step 2: Response received from AppScript", {
      status: appScriptResponse.status,
      statusText: appScriptResponse.statusText
    });

    const appScriptData = await appScriptResponse.json();

    logAsync("handler", "Step 3: Response parsed", {
      success: appScriptData.success,
      error: appScriptData.error || "none",
      warning: appScriptData.warning || "none"
    });

    if (!appScriptResponse.ok) {
      logAsync("handler", "❌ AppScript returned error", {
        status: appScriptResponse.status,
        data: appScriptData
      });
      throw new Error(`AppScript error: ${appScriptData.error || appScriptResponse.statusText}`);
    }

    // === SUCCESS: Critical data captured and sent to team ===
    logAsync("handler", "✅ SUCCESS - Critical data received by team", {
      source,
      timestamp: new Date().toISOString()
    });

    // RETURN SUCCESS IMMEDIATELY - don't wait for any other operations
    res.status(200).json({
      success: true,
      message: 'Form submitted successfully'
    });

  } catch (error) {
    // Log error asynchronously (for debugging only)
    logAsync("handler", "❌ ERROR - Form submission failed", {
      error: error.message,
      stack: error.stack?.split("\n").slice(0, 3).join(" | ")
    });

    console.error('Form submission error:', error.message);

    // Return error to user
    return res.status(400).json({
      success: false,
      message: GENERIC_FORM_ERROR
    });
  }
}
