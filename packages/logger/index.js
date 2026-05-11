export async function logCritical(message, context = {}) {
  // Use provided token and endpoint
  const token = process.env.NEXT_PUBLIC_BETTERSTACK_CRITICAL_TOKEN || process.env.BETTERSTACK_CRITICAL_TOKEN;
  const endpoint = process.env.NEXT_PUBLIC_BETTERSTACK_CRITICAL_ENDPOINT || process.env.BETTERSTACK_CRITICAL_ENDPOINT || 'https://s2430060.eu-fsn-3.betterstackdata.com';

  if (!token) {
    console.warn('[Logger] BETTERSTACK_CRITICAL_TOKEN not set, skipping critical log:', message);
    return;
  }

  try {
    const payload = {
      dt: new Date().toISOString(),
      level: 'critical',
      message: `[CRITICAL] ${message}`,
      ...context,
      environment: process.env.NODE_ENV || 'development',
      source_app: typeof window !== 'undefined' ? 'browser' : 'server'
    };

    // Use fetch (available in Next.js/Node 18+)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error(`[Logger] Failed to send log to BetterStack: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    console.error('[Logger] Error sending critical log:', err);
  }
}
