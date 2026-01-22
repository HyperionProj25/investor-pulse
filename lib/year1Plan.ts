// Year 1 Master Plan - Types and Data
// Baseline Analytics Tax, Compensation & Growth Roadmap

export type PhaseId = "pre-launch" | "launch" | "growth" | "expansion";
export type ChecklistCategory = "tax" | "compensation" | "business";
export type ChecklistStatus = "pending" | "completed";

export interface ChecklistItem {
  id: string;
  text: string;
  category: ChecklistCategory;
  phase: PhaseId;
}

export interface Phase {
  id: PhaseId;
  title: string;
  timeline: string;
  tag: string;
  color: string; // Tailwind color class
  bgColor: string;
  borderColor: string;
  dotColor: string;
}

export interface RevenueMilestone {
  revenue: string;
  label: string;
  items: string[];
}

export interface TaxCalendarQuarter {
  quarter: string;
  months: string;
  items: string[];
}

// Phase definitions with your brand colors
export const phases: Phase[] = [
  {
    id: "pre-launch",
    title: "Pre-Launch",
    timeline: "Now → June 2026",
    tag: "Building & Banking Losses",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    dotColor: "bg-blue-500",
  },
  {
    id: "launch",
    title: "Launch",
    timeline: "June 2026 → Dec 2026",
    tag: "First Revenue & Salaries",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    dotColor: "bg-emerald-500",
  },
  {
    id: "growth",
    title: "Growth",
    timeline: "2027",
    tag: "Scale & Optimize",
    color: "text-[#cb6b1e]",
    bgColor: "bg-[#cb6b1e]/10",
    borderColor: "border-[#cb6b1e]/30",
    dotColor: "bg-[#cb6b1e]",
  },
  {
    id: "expansion",
    title: "Expansion",
    timeline: "2028+",
    tag: "Full Optimization + BBB",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    dotColor: "bg-purple-500",
  },
];

// Checklists organized by phase and category
export const checklists: ChecklistItem[] = [
  // Phase 1: Pre-Launch - Tax Actions
  { id: "p1-t1", text: "Complete Wyoming C-Corp setup — Articles, EIN, registered agent", category: "tax", phase: "pre-launch" },
  { id: "p1-t2", text: "Set up bookkeeping — QuickBooks, Wave, or similar", category: "tax", phase: "pre-launch" },
  { id: "p1-t3", text: "Track ALL expenses — Every dollar = future tax savings", category: "tax", phase: "pre-launch" },
  { id: "p1-t4", text: "Document R&D work — Log what contractor builds monthly", category: "tax", phase: "pre-launch" },
  { id: "p1-t5", text: "File 2025 tax return — Even with $0 profit, documents your NOL", category: "tax", phase: "pre-launch" },

  // Phase 1: Pre-Launch - Compensation Actions
  { id: "p1-c1", text: "Confirm founder equity docs — You & co-founder 50/50, no vesting = no 83(b) needed", category: "compensation", phase: "pre-launch" },
  { id: "p1-c2", text: "Developer equity (7%) — Ensure proper docs, 83(b) if vesting", category: "compensation", phase: "pre-launch" },
  { id: "p1-c3", text: "Advisor equity — Vesting schedule, 83(b) election filed", category: "compensation", phase: "pre-launch" },
  { id: "p1-c4", text: "SAFE documentation — $50K investor SAFE properly filed", category: "compensation", phase: "pre-launch" },
  { id: "p1-c5", text: "Plan option pool — Work with lawyer on 10-15% ESOP structure", category: "compensation", phase: "pre-launch" },

  // Phase 1: Pre-Launch - Business Actions
  { id: "p1-b1", text: "Continue SAFE round — Working toward $500K raise", category: "business", phase: "pre-launch" },
  { id: "p1-b2", text: "Build MVP — Platform development with contractor", category: "business", phase: "pre-launch" },
  { id: "p1-b3", text: "Free camps & beta users — Build case studies, gather data", category: "business", phase: "pre-launch" },
  { id: "p1-b4", text: "Partner pipeline — Line up 20 partners for launch", category: "business", phase: "pre-launch" },
  { id: "p1-b5", text: "409A valuation — Before granting any options (required)", category: "business", phase: "pre-launch" },

  // Phase 2: Launch - Tax Actions
  { id: "p2-t1", text: "Continue R&D documentation — Now with employee wages too", category: "tax", phase: "launch" },
  { id: "p2-t2", text: "Engage R&D credit specialist — Contingency fee, no upfront cost", category: "tax", phase: "launch" },
  { id: "p2-t3", text: "R&D payroll offset — Apply credits against payroll taxes", category: "tax", phase: "launch" },
  { id: "p2-t4", text: "Track NOL balance — Know how much you've banked", category: "tax", phase: "launch" },

  // Phase 2: Launch - Compensation Actions
  { id: "p2-c1", text: "Start founder salaries — $75K-$100K each (reasonable, documented)", category: "compensation", phase: "launch" },
  { id: "p2-c2", text: "Set up payroll — Gusto, Rippling, or similar", category: "compensation", phase: "launch" },
  { id: "p2-c3", text: "Open Solo 401(k) — Simple, allows up to $70K contributions", category: "compensation", phase: "launch" },
  { id: "p2-c4", text: "Health insurance — Company-paid = tax-free to you", category: "compensation", phase: "launch" },
  { id: "p2-c5", text: "First W-2 hire? — Screen for WOTC (veteran, etc.)", category: "compensation", phase: "launch" },

  // Phase 2: Launch - Business Actions
  { id: "p2-b1", text: "Launch platform — June 2026", category: "business", phase: "launch" },
  { id: "p2-b2", text: "Onboard 20 partners — First 3 months goal", category: "business", phase: "launch" },
  { id: "p2-b3", text: "Scale to 50 locations — Year 1 goal", category: "business", phase: "launch" },
  { id: "p2-b4", text: "Build case studies — Partner success stories", category: "business", phase: "launch" },

  // Phase 3: Growth - Tax Actions
  { id: "p3-t1", text: "Burn through NOL — Use banked losses to offset profits", category: "tax", phase: "growth" },
  { id: "p3-t2", text: "Max R&D credits — W-2 wages count 100% (vs 65% for contractors)", category: "tax", phase: "growth" },
  { id: "p3-t3", text: "Section 179 — Immediate deduction on equipment purchases", category: "tax", phase: "growth" },
  { id: "p3-t4", text: "Monitor accumulated earnings — Stay under $250K threshold", category: "tax", phase: "growth" },

  // Phase 3: Growth - Compensation Actions
  { id: "p3-c1", text: "Increase founder salaries — $100K-$150K (with board approval)", category: "compensation", phase: "growth" },
  { id: "p3-c2", text: "Full 401(k) with match — Transition from Solo 401(k) if hiring", category: "compensation", phase: "growth" },
  { id: "p3-c3", text: "Add profit sharing — Additional retirement contributions", category: "compensation", phase: "growth" },
  { id: "p3-c4", text: "Section 105 medical — Reimburse out-of-pocket expenses tax-free", category: "compensation", phase: "growth" },
  { id: "p3-c5", text: "Education assistance — $5,250/employee tax-free", category: "compensation", phase: "growth" },

  // Phase 3: Growth - Business Actions
  { id: "p3-b1", text: "Hire key employees — W-2 with full benefits + equity", category: "business", phase: "growth" },
  { id: "p3-b2", text: "Compensation stacking — Salary + benefits + equity packages", category: "business", phase: "growth" },
  { id: "p3-b3", text: "Update 409A — Before any new equity grants", category: "business", phase: "growth" },
  { id: "p3-b4", text: "Series A prep? — If pursuing institutional funding", category: "business", phase: "growth" },

  // Phase 4: Expansion - Tax/Full Optimization
  { id: "p4-t1", text: "Founder salaries $150K-$200K — Near SS wage base", category: "tax", phase: "expansion" },
  { id: "p4-t2", text: "Consider defined benefit plan — $150K-$350K/year contributions if 50+", category: "tax", phase: "expansion" },
  { id: "p4-t3", text: "Strategic dividends — Manage accumulated earnings tax threshold", category: "tax", phase: "expansion" },
  { id: "p4-t4", text: "Equipment timing — Section 179 in profitable years", category: "tax", phase: "expansion" },
  { id: "p4-t5", text: "BBB donations — Up to 10% of taxable income", category: "tax", phase: "expansion" },

  // Phase 4: Expansion - BBB Launch (using compensation category)
  { id: "p4-c1", text: "Form 501(c)(3) — File with IRS, ~6-12 months approval", category: "compensation", phase: "expansion" },
  { id: "p4-c2", text: "Independent board — You + co-founder + 2-3 community members", category: "compensation", phase: "expansion" },
  { id: "p4-c3", text: "First year: $25K-$50K — Small pilot, prove the model", category: "compensation", phase: "expansion" },
  { id: "p4-c4", text: "Tech grants to schools — HitTrax/Trackman access for underserved", category: "compensation", phase: "expansion" },
  { id: "p4-c5", text: "Diversify funding — Other donors beyond Baseline", category: "compensation", phase: "expansion" },
];

// Immediate Action Items
export const immediateActions = {
  legal: [
    { id: "ia-l1", text: "Confirm Wyoming C-Corp is fully set up" },
    { id: "ia-l2", text: "Review all equity agreements (you, co-founder, dev, advisor)" },
    { id: "ia-l3", text: "Confirm 83(b) status for anyone with vesting" },
  ],
  financial: [
    { id: "ia-f1", text: "Set up bookkeeping (QuickBooks, Wave, etc.)" },
    { id: "ia-f2", text: "Start R&D log — track what contractor builds monthly" },
    { id: "ia-f3", text: "Gather all 2024/2025 expenses for tax filing" },
  ],
};

// Revenue Milestones
export const revenueMilestones: RevenueMilestone[] = [
  {
    revenue: "$0",
    label: "Pre-Revenue",
    items: ["Track expenses", "Bank NOL", "Document R&D", "File returns"],
  },
  {
    revenue: "$100K",
    label: "First Revenue",
    items: ["Start founder salaries", "Set up payroll", "Open 401(k)", "Health insurance", "R&D payroll offset"],
  },
  {
    revenue: "$500K",
    label: "Scaling",
    items: ["Hire W-2 employees", "Full benefits packages", "Compensation stacking", "WOTC screening", "Max retirement"],
  },
  {
    revenue: "$1M",
    label: "Profitability",
    items: ["Burn through NOL", "Full R&D credits", "Section 179 timing", "Consider BBB formation", "Watch accumulated earnings"],
  },
  {
    revenue: "$2M+",
    label: "Full Optimization",
    items: ["Defined benefit plans", "Strategic dividends", "BBB at scale", "Full compensation stacking", "Accumulated earnings management"],
  },
];

// Compensation Stacking Example
export const compensationStackingExample = [
  { component: "Base Salary", amount: "$100,000", taxable: true },
  { component: "401(k) + Profit Sharing", amount: "$30,000", taxable: false },
  { component: "Health Insurance", amount: "$25,000", taxable: false },
  { component: "HSA Contribution", amount: "$8,550", taxable: false },
  { component: "Section 105 Medical", amount: "$8,000", taxable: false },
  { component: "Education Assistance", amount: "$5,250", taxable: false },
  { component: "Equity (0.5% ISOs)", amount: "~$5,000", taxable: false, note: "until sale" },
];

// BBB Tax Math
export const bbbTaxMath = [
  { profit: "$500,000", maxDonation: "$50,000", taxSaved: "$10,500", netCost: "$39,500", kidsHelped: "~50 athletes" },
  { profit: "$1,000,000", maxDonation: "$100,000", taxSaved: "$21,000", netCost: "$79,000", kidsHelped: "~100 athletes" },
  { profit: "$2,000,000", maxDonation: "$200,000", taxSaved: "$42,000", netCost: "$158,000", kidsHelped: "~200 athletes" },
];

// Tax Calendar
export const taxCalendar: TaxCalendarQuarter[] = [
  {
    quarter: "Q1",
    months: "Jan - Mar",
    items: [
      "Issue 1099s (Jan 31)",
      "File Form 1120 (Apr 15) or extension",
      "Make retirement contributions for prior year",
      "Q1 payroll tax deposits",
    ],
  },
  {
    quarter: "Q2",
    months: "Apr - Jun",
    items: [
      "Estimated tax payment (Jun 15)",
      "R&D payroll offset kicks in (if filed)",
      "Q2 payroll tax deposits",
      "Mid-year compensation review",
    ],
  },
  {
    quarter: "Q3",
    months: "Jul - Sep",
    items: [
      "Estimated tax payment (Sep 15)",
      "Q3 payroll tax deposits",
      "Plan year-end equipment purchases",
      "Review accumulated earnings",
    ],
  },
  {
    quarter: "Q4",
    months: "Oct - Dec",
    items: [
      "Board resolution for bonuses (before 12/31)",
      "Make Section 179 purchases",
      "Estimated tax payment (Dec 15)",
      "Plan next year compensation",
      "Wyoming Annual Report",
    ],
  },
];

// Deductions vs Credits Reference
export const deductionsReference = [
  { item: "Salaries", example: "$100K", savings: "Save $21K" },
  { item: "Contractor payments", example: "$50K", savings: "Save $10.5K" },
  { item: "Health insurance", example: "$25K", savings: "Save $5.25K" },
  { item: "Retirement contributions", example: "$70K", savings: "Save $14.7K" },
  { item: "Equipment (Sec 179)", example: "$50K", savings: "Save $10.5K" },
  { item: "BBB donation", example: "$50K", savings: "Save $10.5K" },
];

export const creditsReference = [
  { item: "R&D Credit", detail: "6-8% of qualified expenses" },
  { item: "→ W-2 wages", detail: "100% counts" },
  { item: "→ US contractors", detail: "65% counts" },
  { item: "WOTC (hiring credit)", detail: "$2,400-$9,600/hire" },
  { item: "R&D Payroll Offset", detail: "Up to $500K/year" },
];

// Current State Assessment (January 2025)
export const currentState = {
  entity: "Wyoming C-Corp (transitioning)",
  revenue: "~$0 (pre-launch)",
  team: "2 founders + contractor + equity dev",
  payroll: "$0 (no salaries yet)",
};

// Info boxes content
export const infoBoxes = {
  preLaunch: {
    title: "What's Banking Right Now",
    items: [
      { label: "Net Operating Losses", desc: "Every expense adds to NOL → Offsets future profits" },
      { label: "R&D Credit (Accumulating)", desc: "~7% of contractor dev costs → Use when you have taxes to offset" },
      { label: "QSBS Clock", desc: "5-year holding period started at stock issuance → Potential tax-free exit" },
    ],
  },
  launch: {
    title: "What Unlocks With Salaries",
    items: [
      { icon: "health", label: "Health Insurance", desc: "Tax-free benefit" },
      { icon: "401k", label: "401(k)", desc: "Up to $70K/year tax-deferred" },
      { icon: "rd", label: "R&D Payroll Offset", desc: "Use credits NOW" },
      { icon: "hsa", label: "HSA", desc: "$8,550/year tax-free" },
    ],
  },
};

// Helper to get phase by ID
export function getPhaseById(id: PhaseId): Phase | undefined {
  return phases.find((p) => p.id === id);
}

// Helper to get checklists by phase
export function getChecklistsByPhase(phaseId: PhaseId): ChecklistItem[] {
  return checklists.filter((item) => item.phase === phaseId);
}

// Helper to get checklists by phase and category
export function getChecklistsByPhaseAndCategory(phaseId: PhaseId, category: ChecklistCategory): ChecklistItem[] {
  return checklists.filter((item) => item.phase === phaseId && item.category === category);
}
