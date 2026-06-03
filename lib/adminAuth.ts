import { createHmac, pbkdf2Sync } from 'crypto';
import { NextRequest } from 'next/server';
import { safeCompare } from '@/lib/security';

export const ADMIN_SESSION_COOKIE = 'steren_admin_session';

const SESSION_TTL_SECONDS = 8 * 60 * 60;

type AdminSessionPayload = {
  sub: 'admin';
  username: string;
  iat: number;
  exp: number;
};

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, 'base64').toString('utf8');
}

function adminUsername() {
  return (process.env.ADMIN_USERNAME ?? 'admin').trim();
}

function sessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_TOKEN ||
    process.env.ADMIN_PASSWORD_HASH ||
    process.env.ADMIN_PASSWORD ||
    ''
  );
}

function sign(value: string) {
  const secret = sessionSecret();
  if (!secret) return '';
  return base64UrlEncode(createHmac('sha256', secret).update(value).digest());
}

function verifyPasswordHash(password: string, encodedHash: string) {
  const separator = encodedHash.includes('$') ? '$' : ':';
  const [scheme, iterationsText, saltHex, expectedHex] = encodedHash.split(separator);
  if (scheme !== 'pbkdf2-sha256' || !iterationsText || !saltHex || !expectedHex) {
    return false;
  }

  const iterations = Number(iterationsText);
  if (!Number.isInteger(iterations) || iterations < 100_000) return false;

  const expectedBytes = expectedHex.length / 2;
  const actual = pbkdf2Sync(password, Buffer.from(saltHex, 'hex'), iterations, expectedBytes, 'sha256').toString('hex');
  return safeCompare(actual, expectedHex);
}

export function isAdminAuthConfigured() {
  return Boolean(adminUsername() && sessionSecret() && (process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD));
}

export function verifyAdminCredentials(username: string, password: string) {
  const configuredUsername = adminUsername();
  if (!configuredUsername || !password || !isAdminAuthConfigured()) return false;
  if (!safeCompare(username.trim(), configuredUsername)) return false;

  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (passwordHash) {
    return verifyPasswordHash(password, passwordHash);
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  return Boolean(adminPassword && safeCompare(password, adminPassword));
}

export function createAdminSession(username: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    sub: 'admin',
    username: username.trim(),
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function isAdminSessionValid(value?: string) {
  if (!value || !sessionSecret()) return false;

  const [encodedPayload, suppliedSignature] = value.split('.');
  if (!encodedPayload || !suppliedSignature) return false;

  const expectedSignature = sign(encodedPayload);
  if (!expectedSignature || !safeCompare(suppliedSignature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<AdminSessionPayload>;
    const now = Math.floor(Date.now() / 1000);
    return payload.sub === 'admin' && payload.username === adminUsername() && typeof payload.exp === 'number' && payload.exp > now;
  } catch {
    return false;
  }
}

export function isAdminSessionRequest(req: NextRequest) {
  return isAdminSessionValid(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}
