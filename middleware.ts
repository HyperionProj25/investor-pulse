import { NextRequest, NextResponse } from "next/server";
import { VALIDATION_ERRORS } from "./lib/errorMessages";

const SESSION_COOKIE = "baseline_session";
const SESSION_SECRET = process.env.SESSION_SECRET;

const textEncoder = new TextEncoder();

const base64UrlEncode = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const base64UrlDecodeToString = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded =
    normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  let result = "";
  for (let i = 0; i < binary.length; i += 1) {
    result += String.fromCharCode(binary.charCodeAt(i));
  }
  return result;
};

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
};

const signPayload = async (payload: string) => {
  if (!SESSION_SECRET) {
    throw new Error(VALIDATION_ERRORS.SESSION_SECRET_MISSING);
  }
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(payload)
  );
  return base64UrlEncode(signature);
};

type SessionPayload = {
  slug: string;
  role: "investor" | "admin" | "deck";
  exp: number;
};

const verifySession = async (
  token: string
): Promise<SessionPayload | null> => {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }
  const expectedSignature = await signPayload(encodedPayload);
  if (!timingSafeEqual(signature, expectedSignature)) {
    return null;
  }
  const payload = JSON.parse(
    base64UrlDecodeToString(encodedPayload)
  ) as SessionPayload;
  if (payload.exp < Date.now()) {
    return null;
  }
  return payload;
};

const requiresRole = (pathname: string): SessionPayload["role"][] | null => {
  if (pathname.startsWith("/admin")) {
    return ["admin"];
  }
  if (pathname.startsWith("/pitch-deck")) {
    return ["deck", "admin"];
  }
  return null;
};

export async function middleware(request: NextRequest) {
  const requiredRoles = requiresRole(request.nextUrl.pathname);
  if (!requiredRoles) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = new URL("/", request.url);
    url.searchParams.set("auth", "required");
    return NextResponse.redirect(url);
  }

  const session = await verifySession(token);
  if (!session || !requiredRoles.includes(session.role)) {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/pitch-deck/:path*"],
};
