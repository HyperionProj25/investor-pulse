import { NextRequest, NextResponse } from "next/server";
import { ADMIN_PERSONAS } from "@/lib/adminUsers";
import { AUTH_ERRORS, NETWORK_ERRORS, VALIDATION_ERRORS } from "@/lib/errorMessages";
import { BASELINE_UPDATE, type InvestorPersona } from "@/lib/questionnaire";
import { getServiceSupabaseClient } from "@/lib/supabaseClient";
import {
  buildClearSessionCookie,
  buildSessionCookie,
  createSessionToken,
  SESSION_COOKIE,
  verifySessionToken,
  type SessionRole,
} from "@/lib/session";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const supabase = getServiceSupabaseClient();

const fetchInvestors = async (): Promise<InvestorPersona[]> => {
  try {
    const { data } = await supabase
      .from("site_state")
      .select("payload")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (data?.payload?.investors) {
      return data.payload.investors as InvestorPersona[];
    }
  } catch (error) {
    console.error("Failed to load investors for auth:", error);
  }

  return BASELINE_UPDATE.investors;
};

const issueSessionResponse = (slug: string, role: SessionRole) => {
  const token = createSessionToken(slug, role);
  const response = NextResponse.json({ slug, role });
  response.cookies.set(buildSessionCookie(token));
  return response;
};

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: AUTH_ERRORS.NOT_AUTHENTICATED }, { status: 401 });
  }

  const session = verifySessionToken(token);
  if (!session) {
    const response = NextResponse.json(
      { error: AUTH_ERRORS.SESSION_INVALID },
      { status: 401 }
    );
    response.cookies.set(buildClearSessionCookie());
    return response;
  }

  return NextResponse.json({
    slug: session.slug,
    role: session.role,
    exp: session.exp,
  });
}

type LoginPayload = {
  role: SessionRole;
  slug?: string;
  pin: string;
};

const validateRequestPayload = (payload: Partial<LoginPayload>) => {
  if (!payload?.role || !payload.pin) {
    return VALIDATION_ERRORS.ROLE_AND_PIN_REQUIRED;
  }
  if (!["investor", "admin", "deck"].includes(payload.role)) {
    return VALIDATION_ERRORS.UNSUPPORTED_ROLE;
  }
  return null;
};

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: Allow 5 login attempts per 15 minutes per IP
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(clientIp, {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    });

    if (!rateLimit.success) {
      const resetIn = Math.ceil((rateLimit.resetAt - Date.now()) / 1000 / 60);
      return NextResponse.json(
        {
          error: `Too many login attempts. Please try again in ${resetIn} minute${resetIn !== 1 ? "s" : ""}.`,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.resetAt),
            "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const body = (await request.json()) as Partial<LoginPayload>;
    const validationMessage = validateRequestPayload(body);
    if (validationMessage) {
      return NextResponse.json({ error: validationMessage }, { status: 400 });
    }

    const { role, slug, pin } = body as LoginPayload;

    if (role === "admin") {
      const adminUser = ADMIN_PERSONAS.find((user) => user.pin === pin);
      if (!adminUser) {
        return NextResponse.json({ error: AUTH_ERRORS.ADMIN_PIN_INVALID }, { status: 401 });
      }
      return issueSessionResponse(adminUser.slug, "admin");
    }

    const investors = await fetchInvestors();

    if (role === "deck") {
      const persona =
        investors.find((inv) => inv.slug === "pre-pitch-deck") ||
        BASELINE_UPDATE.investors.find((inv) => inv.slug === "pre-pitch-deck");

      if (!persona || persona.pin !== pin) {
        return NextResponse.json(
          { error: AUTH_ERRORS.DECK_PIN_INVALID },
          { status: 401 }
        );
      }

      return issueSessionResponse(persona.slug, "deck");
    }

    // Investor flow
    if (!slug) {
      return NextResponse.json(
        { error: VALIDATION_ERRORS.INVESTOR_SLUG_REQUIRED },
        { status: 400 }
      );
    }
    const investor = investors.find((inv) => inv.slug === slug);
    if (!investor || investor.pin !== pin) {
      return NextResponse.json(
        { error: AUTH_ERRORS.INVESTOR_CREDENTIALS_INVALID },
        { status: 401 }
      );
    }

    return issueSessionResponse(investor.slug, "investor");
  } catch (error) {
    console.error("Session POST failed:", error);
    return NextResponse.json(
      { error: NETWORK_ERRORS.SESSION_REQUEST_FAILED },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(buildClearSessionCookie());
  return response;
}
