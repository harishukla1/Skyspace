import { NextResponse, type NextRequest } from 'next/server';

/**
 * UX-level gate only: sends signed-out visitors to /login. Real authorization is enforced by the API on every request;
 * this middleware never trusts the cookie for permissions.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.get('ssr_session')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/customer/:path*', '/owner/:path*', '/agent', '/agent/:path*', '/admin/:path*', '/admin'] };
