// Business Operating System (BOS) Types and Data Layer

export interface NorthStar {
  mission: string;
  vision: string;
  principles: string[];
  unfairAdvantages: string[];
  ifNotTrueTest: string;
}

export interface TimeHorizon {
  purpose: string;
  narrative: string;
  notBelongsHere: string;
}

export interface TimeHorizons {
  tenYear: TimeHorizon;
  fiveYear: TimeHorizon;
  threeYear: TimeHorizon;
  oneYear: TimeHorizon;
}

export interface TheBet {
  categoryOwned: string;
  dataAsset: string;
  behaviorsChanged: string;
  whoFeelsThreatened: string;
  fullNarrative: string;
}

export interface ProofSignal {
  id: string;
  signal: string;
  whyMatters: string;
  falseSuccess: string;
}

export interface TheProof {
  signals: ProofSignal[];
}

export interface Quarterly {
  currentQuarter: string; // e.g., "Q1 2025"
  theme: string;
  primaryLever: string;
  supportingLevers: string[];
  killList: string[];
  successSignal: string;
  failureSignal: string;
}

export interface Experiment {
  id: string;
  month: string;
  hypothesis: string;
  action: string;
  signal: string;
  decision: "double_down" | "adjust" | "kill" | "pending";
}

export interface Weekly {
  currentWeek: string;
  movedPrimaryLever: string;
  surprises: string;
  frictionIncreasing: string;
  founderDecisionNeeded: string;
}

export interface SystemMap {
  mermaidDiagram: string;
  leverageCompounds: string;
  fragilityExists: string;
}

export interface BOSPayload {
  northStar: NorthStar;
  timeHorizons: TimeHorizons;
  theBet: TheBet;
  theProof: TheProof;
  quarterly: Quarterly;
  experiments: Experiment[];
  weekly: Weekly;
  systemMap: SystemMap;
  updatedAt: string;
}

// Default/seed data for Baseline Analytics
export const DEFAULT_BOS_PAYLOAD: BOSPayload = {
  northStar: {
    mission:
      "Unify fragmented baseball and softball training environments into one centralized, objective infrastructure that delivers clarity, transparency, and direction to every athlete.",
    vision:
      "An analytics department in every athlete's pocket. Data Redefined. The standard infrastructure layer for player development across all levels of baseball and softball.",
    principles: [
      "Clarity over complexity - if it can't be understood in 30 seconds, simplify it",
      "Objectivity is non-negotiable - data doesn't lie, interpretations do",
      "Direction beats data - insights without action are worthless",
      "Athlete-first design - coaches and facilities are customers, athletes are the product's reason for existing",
      "Local-first, then scale - prove value in one facility before expanding",
    ],
    unfairAdvantages: [
      "Deep domain expertise in baseball/softball training ecosystem",
      "Relationships with facility owners and coaches who trust us",
      "Understanding of what data actually matters for player development",
      "Ability to translate complex metrics into digestible direction",
      "First-mover advantage in unified training data infrastructure",
    ],
    ifNotTrueTest:
      "If training data remains fragmented and inaccessible, player development stays subjective and inconsistent. If we don't build this, athletes continue getting conflicting feedback from different tools with no unified view of their progress.",
  },
  timeHorizons: {
    tenYear: {
      purpose: "The world we change",
      narrative:
        "Every baseball and softball player in North America has access to objective, unified performance data regardless of their facility, team, or economic status. Training decisions are made on evidence, not opinion. The era of fragmented, inaccessible player development data is over.",
      notBelongsHere:
        "Specific product features, revenue targets, team size, technology choices. This is about the change in the world, not the company.",
    },
    fiveYear: {
      purpose: "The company we become",
      narrative:
        "Baseline is the default data infrastructure for serious player development. Facilities choose us because we're the only platform that unifies their entire tech stack. Coaches rely on us because our reports actually drive better outcomes. We've expanded beyond hitting to cover the full player development journey.",
      notBelongsHere:
        "Quarterly metrics, specific partnerships, feature roadmaps. This is about identity and market position.",
    },
    threeYear: {
      purpose: "The platform we own",
      narrative:
        "We own the 'unified training data' category for baseball/softball. Our data consolidation layer connects HitTrax, Blast, TrackMan, Rapsodo, and emerging tools into one coherent athlete profile. Facilities pay us monthly because we make their existing investments more valuable. We're expanding from reports to real-time coaching insights.",
      notBelongsHere:
        "Weekly tasks, hiring plans, specific customer names. This is about strategic positioning.",
    },
    oneYear: {
      purpose: "The proof we deliver",
      narrative:
        "We have paying facility customers generating recurring revenue. Our report pipeline runs reliably with defined SLAs. Athletes and coaches actively use our reports to make training decisions. We've proven the model works and are ready to scale.",
      notBelongsHere:
        "Long-term vision statements, multi-year projections. This is about proving the thesis with concrete evidence.",
    },
  },
  theBet: {
    categoryOwned:
      "Unified Player Development Data Infrastructure - the layer that sits between training technology (HitTrax, Blast, etc.) and the humans who need to act on that data.",
    dataAsset:
      "Longitudinal athlete performance data across multiple training modalities, normalized and contextualized. The only dataset that shows how an athlete's metrics from different tools relate to each other over time.",
    behaviorsChanged:
      "Coaches stop looking at 5 different apps and start looking at one Baseline report. Athletes stop getting conflicting feedback and start getting unified direction. Facility owners stop buying redundant tools and start investing in the integration layer.",
    whoFeelsThreatened:
      "HitTrax, Blast, Rapsodo, and TrackMan if they wanted to become platform players (they're hardware-first). Generic sports analytics platforms that don't understand baseball. Manual report creators who charge facilities for Excel work.",
    fullNarrative:
      "The baseball training technology market is fragmented by design - every hardware company wants lock-in. This creates a mess for facilities running multiple systems and athletes training across different locations. We bet that the integration layer is more valuable than any single tool, and that whoever owns the unified view of athlete development owns the relationship. We're not competing with HitTrax or Blast - we're making them more valuable by connecting them. Our moat is the normalized, longitudinal dataset that no single tool can replicate.",
  },
  theProof: {
    signals: [
      {
        id: "proof-1",
        signal: "3+ facilities paying monthly subscription",
        whyMatters:
          "Proves facilities will pay for data infrastructure, not just reports",
        falseSuccess:
          "Facilities paying for one-time reports without committing to recurring relationship",
      },
      {
        id: "proof-2",
        signal: "Report pipeline SLA: 24-hour turnaround maintained for 30+ days",
        whyMatters:
          "Proves we can operationalize data processing at scale, not just one-off analysis",
        falseSuccess:
          "Heroic manual effort to meet deadlines without sustainable systems",
      },
      {
        id: "proof-3",
        signal: "50+ athletes with longitudinal data (3+ sessions tracked)",
        whyMatters:
          "Proves our data model captures meaningful progression over time",
        falseSuccess:
          "One-time snapshots without athletes returning for follow-up sessions",
      },
      {
        id: "proof-4",
        signal: "Coach testimonial: 'Changed how I train this athlete'",
        whyMatters:
          "Proves our reports drive actual behavior change, not just information consumption",
        falseSuccess:
          "Coaches saying reports are 'interesting' but not changing their approach",
      },
      {
        id: "proof-5",
        signal: "Data from 2+ different tool types consolidated in one report",
        whyMatters:
          "Proves our unification thesis - we can connect fragmented data sources",
        falseSuccess:
          "Only processing single-source data with no actual consolidation",
      },
    ],
  },
  quarterly: {
    currentQuarter: "Q_ 20__",
    theme: "Set your quarterly theme here - what's the narrative for this quarter?",
    primaryLever:
      "Define the ONE lever that matters most this quarter. Everything else supports this.",
    supportingLevers: [
      "Supporting lever 1 - how does this help the primary?",
      "Supporting lever 2 - how does this help the primary?",
      "Supporting lever 3 - how does this help the primary?",
    ],
    killList: [
      "What we're NOT doing this quarter (be specific)",
      "Shiny object we're ignoring",
      "Good idea that's not right now",
    ],
    successSignal:
      "What does it look like if we win this quarter? Be specific and measurable.",
    failureSignal:
      "What does it look like if we failed? What would we see?",
  },
  experiments: [
    {
      id: "exp-1",
      month: "Month 1",
      hypothesis: "Example: If we offer free first reports, facilities will convert to paid",
      action: "Example: Reach out to 10 facilities with free report offer",
      signal: "Example: 3+ facilities request paid follow-up",
      decision: "pending",
    },
  ],
  weekly: {
    currentWeek: "",
    movedPrimaryLever: "",
    surprises: "",
    frictionIncreasing: "",
    founderDecisionNeeded: "",
  },
  systemMap: {
    mermaidDiagram: `graph LR
    A[Training Tech<br/>HitTrax/Blast/etc] --> B[Baseline Data Layer]
    B --> C[Unified Reports]
    C --> D[Coach Decisions]
    D --> E[Better Athletes]
    E --> F[Facility Growth]
    F --> G[More Data]
    G --> B

    style B fill:#cb6b1e,stroke:#f6e1bd,color:#000
    style C fill:#1a1a1a,stroke:#cb6b1e
    style D fill:#1a1a1a,stroke:#cb6b1e`,
    leverageCompounds:
      "Data compounds: Every athlete session makes our normalization smarter. Every facility adds context. Every report trains our insight engine. The more we process, the better our outputs become without additional effort.",
    fragilityExists:
      "Single points of failure: Manual report generation, founder-dependent sales relationships, reliance on HitTrax API stability. Key risk: If a major hardware player decides to build their own unification layer, we need enough data moat to stay ahead.",
  },
  updatedAt: new Date().toISOString(),
};

// Helper to generate unique IDs
export function generateBOSId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
