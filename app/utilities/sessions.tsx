import { createCookieSessionStorage } from '@remix-run/node';

const sessionSecret = process.env.SESSION_SECRET;
if (sessionSecret === undefined || sessionSecret === '') {
  throw new Error('SESSION_SECRET must be set');
}

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'RJ_session',
    secure: process.env.NODE_ENV === 'production',
    secrets: [sessionSecret],
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;
