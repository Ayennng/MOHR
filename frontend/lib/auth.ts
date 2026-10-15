import NextAuth from 'next-auth';
import type { NextAuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createRateLimiter, tooManyAttemptsMessage } from '@/lib/rate-limit';

// Extend NextAuth types to include custom fields
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
      name?: string | null;
      image?: string | null;
      phone?: string | null;
      department?: string | null;
    };
  }
  interface User {
    id: string;
    email: string;
    role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
    name?: string;
    image?: string | null;
    phone?: string;
    department?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
    image?: string | null;
    phone?: string;
    department?: string;
  }
}

// 30 sign-in attempts per client IP per 15 minutes
const loginAttemptsByIp = createRateLimiter({ limit: 30, windowMs: 15 * 60 * 1000 });

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'john@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req): Promise<User | null> {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Per-client limit on all attempts, against password spraying across many
        // accounts (the backend separately limits failures per email). Behind a reverse
        // proxy the client IP comes from X-Forwarded-For; set it at the proxy.
        const forwardedFor = req?.headers?.['x-forwarded-for'];
        const clientIp = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)?.split(',')[0].trim() || 'unknown';
        const retryAfter = loginAttemptsByIp.retryAfter(clientIp);
        if (retryAfter > 0) {
          // NextAuth passes a thrown error's message to signIn() as result.error
          throw new Error(tooManyAttemptsMessage(retryAfter));
        }
        loginAttemptsByIp.hit(clientIp);

        let res: Response;
        try {
          const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
          res = await fetch(`${backendUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });
        } catch (error) {
          console.error('Auth error:', error);
          throw new Error('Sign-in is temporarily unavailable. Please try again.');
        }

        if (res.status === 429) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Too many failed attempts. Try again later.');
        }

        if (!res.ok) {
          return null;
        }

        const user = await res.json();
        return {
          id: user.id,
          email: user.email,
          name: user.name || `${user.firstName} ${user.lastName}`,
          role: user.role,
          image: user.avatar ?? null,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.image = user.image || null;
        token.phone = user.phone;
        token.department = user.department;
      }
      // useSession().update() from the profile page: accept display fields only.
      // id/role must never come from the client (the backend re-checks role anyway).
      if (trigger === 'update' && session?.user) {
        if (typeof session.user.name === 'string') token.name = session.user.name;
        if (session.user.image === null || typeof session.user.image === 'string') {
          token.image = session.user.image;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.image = token.image || null;
        session.user.phone = token.phone;
        session.user.department = token.department;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export const GET = handler;
export const POST = handler;

// Export authOptions for use with getServerSession
export default authOptions;
