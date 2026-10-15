import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Next.js 16 "proxy" (formerly middleware): sends signed-out visitors to /login.
// This only guards pages; every API route is authorised again by the backend.
export const proxy = withAuth(
  function onSuccess() {
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

export const config = {
  // Every page except the public ones (login, register), API routes and static assets
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|register).*)'],
};
