export const SESSION_COOKIE_NAME = 'hft_session';
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24;

function getCookieDomain(req) {
  const configuredDomain = process.env.SESSION_COOKIE_DOMAIN || process.env.AUTH_COOKIE_DOMAIN;
  if (configuredDomain) return configuredDomain;

  const host = (req?.headers?.get('host') || '').split(':')[0];
  if (process.env.NODE_ENV === 'production' && (host === 'hirefortravel.com' || host.endsWith('.hirefortravel.com'))) {
    return '.hirefortravel.com';
  }

  return undefined;
}

function isSecureCookie(req) {
  const proto = req?.headers?.get('x-forwarded-proto');
  const host = req?.headers?.get('host') || '';
  return process.env.NODE_ENV === 'production' || proto === 'https' || host.endsWith('hirefortravel.com');
}

export function getSessionCookieOptions(req) {
  const domain = getCookieDomain(req);

  return {
    httpOnly: true,
    secure: isSecureCookie(req),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE,
    ...(domain ? { domain } : {})
  };
}

export function setSessionCookie(response, token, req) {
  response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(req));
  return response;
}

export function clearSessionCookie(response, req) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    ...getSessionCookieOptions(req),
    maxAge: 0,
    expires: new Date(0)
  });
  return response;
}
