import { NextResponse } from 'next/server';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Define public paths that don't require authentication
  const isPublicPath = pathname === '/login';

  // Get the token from the cookies
  const token = request.cookies.get('hft_session')?.value || '';

  // Public paths don't need token validation here
  if (isPublicPath) {
    if (token) {
      return NextResponse.redirect(new URL('/', request.nextUrl));
    }
    return NextResponse.next();
  }

  // If no token on protected path, redirect
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.nextUrl));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
