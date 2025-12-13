import type { InvestorPersona } from "./questionnaire";

export type AdminUser = InvestorPersona & {
  slug: string;
  pin: string;
  shortLabel: string;
};

// Client-safe admin data (without PINs)
export type AdminPersonaWithoutPin = Omit<AdminUser, "pin">;

export const ADMIN_PERSONAS_WITHOUT_PIN: AdminPersonaWithoutPin[] = [
  {
    slug: "chase-admin",
    name: "Chase (Admin)",
    shortLabel: "Chase",
    firm: "Baseline",
    title: "Co-Founder",
    focusArea: "unlocking internal updates and publishing investor-ready notes.",
    welcomeNote:
      "Admin access unlocked — use the questionnaire button to publish an update.",
    highlight: "Latest investor letter drafts are staged here.",
    keyQuestions: [
      "Are all sections ready to publish?",
      "Does the round snapshot reflect current numbers?",
      "Have we archived the prior update?",
    ],
    nextStep: "Open the questionnaire to edit and push the latest content live.",
    pixelAccent: "#a855f7",
    pixelMuted: "#e9d5ff",
  },
  {
    slug: "sheldon-admin",
    name: "Sheldon (Admin)",
    shortLabel: "Sheldon",
    firm: "Baseline",
    title: "Partner",
    focusArea: "coordinating investor communication and traction timelines.",
    welcomeNote:
      "Admin view active — capture the freshest metrics before you publish.",
    highlight: "Questionnaire button is now available in the nav.",
    keyQuestions: [
      "Do the milestones align with the latest traction?",
      "Is the countdown milestone still accurate?",
      "Have we exported the new update to history?",
    ],
    nextStep: "Head to the questionnaire page to edit and push a new update.",
    pixelAccent: "#0ea5e9",
    pixelMuted: "#bae6fd",
  },
];

// Server-side only: Get admin personas with PINs
export function getAdminPersonasWithPins(): AdminUser[] {
  return ADMIN_PERSONAS_WITHOUT_PIN.map((persona) => {
    let pin: string;

    if (persona.slug === "chase-admin") {
      pin = process.env.ADMIN_PIN_CHASE || (() => { throw new Error("ADMIN_PIN_CHASE environment variable is required"); })();
    } else if (persona.slug === "sheldon-admin") {
      pin = process.env.ADMIN_PIN_SHELDON || (() => { throw new Error("ADMIN_PIN_SHELDON environment variable is required"); })();
    } else {
      throw new Error(`Unknown admin slug: ${persona.slug}`);
    }

    return {
      ...persona,
      pin,
    };
  });
}

// Backward compatibility: deprecated, use ADMIN_PERSONAS_WITHOUT_PIN on client or getAdminPersonasWithPins() on server
export const ADMIN_PERSONAS = ADMIN_PERSONAS_WITHOUT_PIN;

export const ADMIN_SLUGS = ADMIN_PERSONAS_WITHOUT_PIN.map((admin) => admin.slug);
