import crypto from "crypto";
import { VALIDATION_ERRORS } from "./errorMessages";

export type SessionRole = "investor" | "admin" | "deck";

export type SessionPayload = {
  slug: string;
  role: SessionRole;
  exp: number;
  nonce: string;
};

export const SESSION_COOKIE = "baseline_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;
const SESSION_DURATION_MS = SESSION_MAX_AGE_SECONDS * 1000;

const getSessionSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(VALIDATION_ERRORS.SESSION_SECRET_MISSING);
  }
  return secret;
};

const encodePayload = (payload: SessionPayload) =>
  Buffer.from(JSON.stringify(payload)).toString("base64url");

const signPayload = (encodedPayload: string) =>
  crypto
    .createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");

const safeCompare = (a: string, b: string) => {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
};

export const createSessionToken = (slug: string, role: SessionRole) => {
  const payload: SessionPayload = {
    slug,
    role,
    exp: Date.now() + SESSION_DURATION_MS,
    nonce: crypto.randomBytes(16).toString("hex"),
  };
  const encoded = encodePayload(payload);
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
};

export const verifySessionToken = (token: string): SessionPayload | null => {
  try {
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) {
      return null;
    }
    const expectedSignature = signPayload(encoded);
    if (!safeCompare(signature, expectedSignature)) {
      return null;
    }
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf-8")
    ) as SessionPayload;
    if (payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch (error) {
    console.error("Session verification failed:", error);
    return null;
  }
};

const baseCookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const buildSessionCookie = (token: string) => ({
  name: SESSION_COOKIE,
  value: token,
  ...baseCookieConfig,
  maxAge: SESSION_MAX_AGE_SECONDS,
});

export const buildClearSessionCookie = () => ({
  name: SESSION_COOKIE,
  value: "",
  ...baseCookieConfig,
  maxAge: 0,
});
