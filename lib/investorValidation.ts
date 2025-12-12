import type { InvestorPersona } from "./questionnaire";
import crypto from "crypto";

export type ValidationError = {
  field: string;
  message: string;
};

/**
 * Validate all fields of an investor object
 */
export function validateInvestorData(
  investor: Partial<InvestorPersona>
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required field validation
  if (!investor.slug || investor.slug.trim() === "") {
    errors.push({ field: "slug", message: "Slug is required" });
  } else if (!isValidSlug(investor.slug)) {
    errors.push({
      field: "slug",
      message: "Slug must be lowercase letters, numbers, and hyphens only",
    });
  }

  if (!investor.name || investor.name.trim() === "") {
    errors.push({ field: "name", message: "Name is required" });
  }

  // Firm and title are now optional
  // (removed validation for firm and title)

  if (!investor.focusArea || investor.focusArea.trim() === "") {
    errors.push({ field: "focusArea", message: "Focus area is required" });
  }

  if (!investor.welcomeNote || investor.welcomeNote.trim() === "") {
    errors.push({ field: "welcomeNote", message: "Welcome note is required" });
  }

  if (!investor.highlight || investor.highlight.trim() === "") {
    errors.push({ field: "highlight", message: "Highlight is required" });
  }

  if (!investor.nextStep || investor.nextStep.trim() === "") {
    errors.push({ field: "nextStep", message: "Next step is required" });
  }

  // Key questions validation
  if (!investor.keyQuestions || investor.keyQuestions.length !== 3) {
    errors.push({
      field: "keyQuestions",
      message: "Exactly 3 key questions are required",
    });
  } else {
    investor.keyQuestions.forEach((q, idx) => {
      if (!q || q.trim() === "") {
        errors.push({
          field: `keyQuestions[${idx}]`,
          message: `Question ${idx + 1} is required`,
        });
      }
    });
  }

  // Color validation
  if (!investor.pixelAccent || !isValidHexColor(investor.pixelAccent)) {
    errors.push({
      field: "pixelAccent",
      message: "Valid hex color required (e.g., #cb6b1e)",
    });
  }

  if (!investor.pixelMuted || !isValidHexColor(investor.pixelMuted)) {
    errors.push({
      field: "pixelMuted",
      message: "Valid hex color required (e.g., #f6e1bd)",
    });
  }

  // PIN validation
  if (!investor.pin || !isValidPin(investor.pin)) {
    errors.push({
      field: "pin",
      message: "PIN must be exactly 4 digits",
    });
  }

  return errors;
}

/**
 * Check if a slug is unique among investors
 */
export function checkSlugUniqueness(
  slug: string,
  investors: InvestorPersona[],
  excludeSlug?: string
): boolean {
  return !investors.some(
    (inv) => inv.slug === slug && inv.slug !== excludeSlug
  );
}

/**
 * Generate a cryptographically secure random 4-digit PIN
 */
export function generateRandomPin(): string {
  // Generate random number between 1000 and 9999 (no leading zeros)
  const pin = crypto.randomInt(1000, 10000);
  return pin.toString();
}

/**
 * Sanitize a slug to ensure it's URL-safe
 */
export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Generate a slug from a name
 */
export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Validate PIN format (exactly 4 digits)
 */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/**
 * Validate hex color format (#RRGGBB)
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Validate slug format (lowercase letters, numbers, hyphens)
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug === slug.toLowerCase();
}
