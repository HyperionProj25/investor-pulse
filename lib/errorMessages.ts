export const DATABASE_ERRORS = {
  SITE_STATE_FETCH: "We couldn't load the latest investor briefing. Refresh and try again.",
  PITCH_DECK_FETCH: "We couldn't load the pitch deck content. Refresh and try again.",
  ADMIN_PUBLISH_FAILED: "We couldn't publish your updates right now. Review the fields and try again.",
  PITCH_DECK_SAVE_FAILED: "We couldn't save the pitch deck changes right now. Try again shortly.",
  QUESTIONNAIRE_UPDATE_FAILED: "We couldn't update the questionnaire data just now. Try again shortly.",
  GENERIC: "We ran into a database issue. Try again shortly.",
} as const;

export const AUTH_ERRORS = {
  INVESTOR_PROFILE_NOT_FOUND: "We couldn't find that investor profile.",
  INVESTOR_PIN_INCORRECT: "That PIN doesn't match our records. Check your secure text and try again.",
  ADMIN_PIN_INVALID: "We couldn't verify that admin PIN. Double-check the secure code.",
  DECK_PIN_INVALID: "We couldn't verify that pitch deck PIN. Double-check the code.",
  SESSION_EXPIRED: "Your session expired. Log in through the access portal.",
  SESSION_REQUIRED: "Pitch deck access requires a deck or admin PIN.",
  SESSION_INVALID: "Your session expired or is invalid. Log in again.",
  NOT_AUTHENTICATED: "You need to sign in before continuing.",
  INVESTOR_CREDENTIALS_INVALID: "Those investor credentials don't match. Check the PIN and try again.",
  ADMIN_ACCESS_REQUIRED: "Log in as Chase or Sheldon to publish updates.",
} as const;

export const VALIDATION_ERRORS = {
  INVESTOR_SELECTION_REQUIRED: "Select an investor profile to continue.",
  INVESTOR_CONFIGURATION_REQUIRED: "No investor profiles are configured.",
  INVESTOR_CONFIGURATION_GUIDANCE: "Add one via the admin workspace to enable login.",
  ROLE_AND_PIN_REQUIRED: "Provide both a role and PIN before continuing.",
  UNSUPPORTED_ROLE: "That access role isn't supported.",
  INVESTOR_SLUG_REQUIRED: "Choose an investor profile before continuing.",
  PAYLOAD_REQUIRED: "Include the payload before continuing.",
  QUESTIONNAIRE_PASTE_REQUIRED: "Paste questionnaire JSON before applying.",
  QUESTIONNAIRE_PARSE_FAILED: "We couldn't read that JSON. Confirm the formatting and try again.",
  QUESTIONNAIRE_RESET_FAILED: "We couldn't reset to the default questionnaire. Try again.",
  QUESTIONNAIRE_CLIPBOARD_BLOCKED: "Clipboard access was blocked. Use Load Template instead.",
  QUESTIONNAIRE_IMPORT_FAILED: "We couldn't import that JSON file. Confirm it's valid and try again.",
  PITCH_DECK_VIDEO_URL_INVALID: "We couldn't load that video link. Check the YouTube URL and try again.",
  PUBLISH_FIELDS_INCOMPLETE: "Please resolve the highlighted fields before publishing.",
  SUPABASE_BROWSER_CONFIG_MISSING:
    "Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before continuing.",
  SUPABASE_SERVICE_CONFIG_MISSING:
    "Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before continuing.",
  SESSION_SECRET_MISSING: "SESSION_SECRET isn't set. Define it to handle sessions securely.",
} as const;

export const NETWORK_ERRORS = {
  GENERIC: "We ran into a network issue. Check your connection and try again.",
  SESSION_REQUEST_FAILED: "We couldn't start a secure session. Try again.",
  SESSION_VERIFICATION_FAILED: "We couldn't verify your access token. Check your connection and try again.",
  PIN_VERIFICATION_FAILED: "We couldn't verify that PIN. Check your connection and try again.",
  SESSION_END_FAILED: "We couldn't end the session. Refresh and try again.",
} as const;

export const FILE_UPLOAD_ERRORS = {
  FIELD_MISSING: "Select a file to upload before continuing.",
  EMPTY_FILE: "The selected file is empty. Choose a different file.",
  TOO_LARGE: "That file exceeds the 50MB limit.",
  TYPE_UNSUPPORTED: "Unsupported file type. Upload a PDF or one of the supported video formats.",
  UPLOAD_FAILED: "We couldn't upload the file. Try again.",
  PUBLIC_URL_FAILED: "We couldn't generate a public link for the upload.",
  INTERNAL_ERROR: "We couldn't finish the upload because of a server issue. Try again.",
} as const;

export const GENERAL_ERRORS = {
  UNKNOWN: "Something went wrong. Try again in a moment.",
} as const;

type ErrorMatcher = {
  pattern: RegExp;
  friendly: string;
};

const TECHNICAL_ERROR_MATCHERS: ErrorMatcher[] = [
  { pattern: /network|fetch|timeout/i, friendly: NETWORK_ERRORS.GENERIC },
  { pattern: /json|syntax|parse/i, friendly: VALIDATION_ERRORS.QUESTIONNAIRE_PARSE_FAILED },
  { pattern: /auth|token|session/i, friendly: NETWORK_ERRORS.SESSION_VERIFICATION_FAILED },
  { pattern: /upload|storage|bucket/i, friendly: FILE_UPLOAD_ERRORS.UPLOAD_FAILED },
  { pattern: /database|relation|table|row|constraint/i, friendly: DATABASE_ERRORS.GENERIC },
];

const extractMessage = (error: unknown): string | null => {
  if (typeof error === "string") {
    return error.trim() || null;
  }
  if (error instanceof Error && error.message?.trim()) {
    return error.message.trim();
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = ((error as { message?: string }).message ?? "").trim();
    return message || null;
  }
  return null;
};

export const getUserFriendlyError = (error: unknown, fallback = GENERAL_ERRORS.UNKNOWN) => {
  const normalized = extractMessage(error);
  if (!normalized) {
    return fallback;
  }

  if (typeof error === "string") {
    return normalized;
  }

  const matcher = TECHNICAL_ERROR_MATCHERS.find(({ pattern }) =>
    pattern.test(normalized)
  );
  if (matcher) {
    return matcher.friendly;
  }

  return fallback;
};
