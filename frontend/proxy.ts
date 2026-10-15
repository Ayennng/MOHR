import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export const middleware = withAuth(
  function onSuccess(req) {
    // Allow the request to proceed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

// Configure which routes require authentication
export const config = {
  matcher: [
    // Protect all routes under /dashboard
    '/dashboard/:path*',
    // Protect other admin routes
    '/employees/:path*',
    '/leave/:path*',
    '/attendance/:path*',
    '/rooms/:path*',
    '/reports/:path*',
    // Exclude public routes and API
    '/((?!api|_next/static|_next/image|favicon.ico|login|register).*)',
  ],
};
