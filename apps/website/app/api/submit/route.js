import { NextResponse } from 'next/server';

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

  console.log(logEntry);
  if (data !== undefined) {
    console.log("  📦 Data:", data);
  }

  let level = "info";
  if (message.includes("ERROR") || message.includes("❌")) {
    level = "error";
  } else if (message.includes("⚠️")) {
    level = "warning";
  }

  await sendToBetterStack(level, step, message, data);
}

// Fire-and-forget logging
function logAsync(step, message, data) {
  debugLog(step, message, data).catch(err => {
    console.error("Logging error:", err.message);
  });
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(req) {
  logAsync("handler", "✅ Preflight request handled");
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  return response;
}

// POST handler
export async function POST(req) {
  try {
    const body = await req.json();

    logAsync("handler", "🔄 NEW REQUEST - Form submission received", {
      bodySize: JSON.stringify(body).length,
      bodyKeys: Object.keys(body).join(", ")
    });

    const source = body.source || "Contact";
    const systemFields = ['timestamp', 'pageUrl', 'originPage', 'source', 'cta'];

    const submittedFields = Object.entries(body)
      .filter(([key, value]) => {
        if (systemFields.includes(key)) return false;
        if (key.endsWith('Data') || key.endsWith('Name')) return false;
        return value !== null && value !== undefined && String(value).trim() !== '';
      });

    const hasEmail = body.email && String(body.email).trim() !== '';
    const hasPhone = body.phoneNumber && String(body.phoneNumber).trim() !== '';

    if (!hasEmail && !hasPhone) {
      throw new Error('At least email or phone number is required');
    }

    for (const [field, value] of submittedFields) {
      if (!value || String(value).trim() === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    logAsync("handler", "✅ Critical validation passed", {
      source,
      submittedFields: submittedFields.map(([field]) => field)
    });

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
      body: JSON.stringify(body),
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

    if (!appScriptResponse.ok || appScriptData.success !== true) {
      logAsync("handler", "❌ AppScript returned error", {
        status: appScriptResponse.status,
        data: appScriptData
      });
      throw new Error(`AppScript error: ${appScriptData.error || appScriptResponse.statusText}`);
    }

    logAsync("handler", "✅ SUCCESS - Critical data received by team", {
      source,
      timestamp: new Date().toISOString()
    });

    // Return response with CORS headers
    const response = NextResponse.json({
      success: true,
      message: 'Form submitted successfully'
    }, { status: 200 });

    response.headers.set('Access-Control-Allow-Origin', '*');
    
    return response;

  } catch (error) {
    logAsync("handler", "❌ ERROR - Form submission failed", {
      error: error.message,
      stack: error.stack?.split("\n").slice(0, 3).join(" | ")
    });

    console.error('Form submission error:', error.message);

    const errorResponse = NextResponse.json({
      success: false,
      message: GENERIC_FORM_ERROR
    }, { status: 400 });

    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    
    return errorResponse;
  }
}
