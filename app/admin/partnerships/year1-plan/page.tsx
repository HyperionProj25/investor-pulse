"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ADMIN_SLUGS } from "@/lib/adminUsers";
import { useYear1PlanStorage } from "@/hooks/useYear1PlanStorage";
import {
  phases,
  checklists,
  immediateActions,
  revenueMilestones,
  compensationStackingExample,
  bbbTaxMath,
  taxCalendar,
  deductionsReference,
  creditsReference,
  currentState,
  infoBoxes,
  getChecklistsByPhaseAndCategory,
  type PhaseId,
  type ChecklistItem,
} from "@/lib/year1Plan";

// Section IDs for navigation
const sectionIds = [
  "header",
  "current-state",
  "phase-overview",
  "phase-1",
  "phase-2",
  "phase-3",
  "phase-4",
  "revenue-milestones",
  "deductions-credits",
  "immediate-actions",
  "tax-calendar",
] as const;

type SectionId = (typeof sectionIds)[number];

const sectionLabels: Record<SectionId, string> = {
  header: "Overview",
  "current-state": "Current State",
  "phase-overview": "Phase Overview",
  "phase-1": "Phase 1: Pre-Launch",
  "phase-2": "Phase 2: Launch",
  "phase-3": "Phase 3: Growth",
  "phase-4": "Phase 4: Expansion",
  "revenue-milestones": "Revenue Triggers",
  "deductions-credits": "Deductions vs Credits",
  "immediate-actions": "Action Items",
  "tax-calendar": "Tax Calendar",
};

export default function Year1PlanPage() {
  const router = useRouter();
  const [authorizedAdmin, setAuthorizedAdmin] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("header");
  const [isPrintMode, setIsPrintMode] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const {
    isLoaded,
    toggleCheckbox,
    toggleSection,
    isChecked,
    isCollapsed,
    getOverallProgress,
    getPhaseProgress,
    exportState,
    expandAll,
  } = useYear1PlanStorage();

  // Verify admin session
  useEffect(() => {
    const verifySession = async () => {
      const response = await fetch("/api/auth/session");
      const data = await response.json();
      if (data.role === "admin" && ADMIN_SLUGS.includes(data.slug)) {
        setAuthorizedAdmin(data.slug);
      } else {
        router.push("/?mode=admin");
      }
    };
    void verifySession();
  }, [router]);

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as SectionId);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
        sectionRefs.current[id] = el;
      }
    });

    return () => observer.disconnect();
  }, [authorizedAdmin]);

  // Get all checklist IDs for progress calculation
  const allChecklistIds = checklists.map((item) => item.id);
  const allImmediateIds = [
    ...immediateActions.legal.map((i) => i.id),
    ...immediateActions.financial.map((i) => i.id),
  ];
  const allIds = [...allChecklistIds, ...allImmediateIds];

  const overallProgress = getOverallProgress(allIds);

  const scrollToSection = (id: SectionId) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handlePrint = () => {
    expandAll();
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 100);
  };

  if (!authorizedAdmin || !isLoaded) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center">
        <div className="animate-pulse text-[#737373]">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#020202] ${isPrintMode ? "print-mode" : ""}`}>
      {/* Sticky Sidebar Navigation - Hidden in print */}
      <aside className="fixed left-0 top-0 h-full w-56 bg-[#0a0a0a] border-r border-[#1f1f1f] z-40 hidden lg:block print:hidden">
        <div className="p-4 border-b border-[#1f1f1f]">
          <Link
            href="/admin/partnerships"
            className="flex items-center gap-2 text-[#a3a3a3] hover:text-[#f6e1bd] transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Partnerships
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="p-4 border-b border-[#1f1f1f]">
          <div className="text-xs text-[#737373] uppercase tracking-wider mb-2">Overall Progress</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-[#1f1f1f] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#cb6b1e] transition-all duration-300"
                style={{ width: `${overallProgress.percentage}%` }}
              />
            </div>
            <span className="text-[#f6e1bd] text-sm font-medium">{overallProgress.percentage}%</span>
          </div>
          <div className="text-xs text-[#737373] mt-1">
            {overallProgress.completed} / {overallProgress.total} items
          </div>
        </div>

        {/* Section Navigation */}
        <nav className="p-2 overflow-y-auto max-h-[calc(100vh-180px)]">
          {sectionIds.map((id) => (
            <button
              key={id}
              onClick={() => scrollToSection(id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === id
                  ? "bg-[#cb6b1e]/20 text-[#cb6b1e]"
                  : "text-[#a3a3a3] hover:text-[#f6e1bd] hover:bg-[#1f1f1f]"
              }`}
            >
              {sectionLabels[id]}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-56 p-4 md:p-8 max-w-6xl">
        {/* SECTION 1: Header */}
        <section id="header" className="mb-12">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#f6e1bd] mb-2">
                Baseline Analytics — Year 1 Master Plan
              </h1>
              <p className="text-[#a3a3a3] text-lg">Taxes, Compensation & Growth Roadmap</p>
              <p className="text-[#737373] text-sm mt-1">
                From Pre-Launch → June 2026 Launch → First $1M Revenue
              </p>
            </div>
            <div className="flex gap-2 print:hidden">
              <button
                onClick={exportState}
                className="px-3 py-2 text-sm border border-[#2a2a2a] text-[#a3a3a3] rounded-lg hover:border-[#cb6b1e] hover:text-[#f6e1bd] transition-colors"
              >
                Export JSON
              </button>
              <button
                onClick={handlePrint}
                className="px-3 py-2 text-sm bg-[#cb6b1e] text-black rounded-lg hover:bg-[#cb6b1e]/90 transition-colors font-medium"
              >
                Print / PDF
              </button>
            </div>
          </div>
          <div className="text-xs text-[#737373]">
            Last Updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </div>
        </section>

        {/* SECTION 2: Current State Assessment */}
        <section id="current-state" className="mb-12">
          <h2 className="text-xl font-semibold text-[#f6e1bd] mb-4">Current State Assessment (January 2025)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: "Entity", value: currentState.entity },
              { label: "Revenue", value: currentState.revenue },
              { label: "Team", value: currentState.team },
              { label: "Payroll", value: currentState.payroll },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#0b0b0b] border border-[#1f1f1f] rounded-xl p-4">
                <div className="text-xs text-[#737373] uppercase tracking-wider mb-1">{stat.label}</div>
                <div className="text-[#f6e1bd] font-medium text-sm">{stat.value}</div>
              </div>
            ))}
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex gap-3">
              <div className="text-yellow-500 text-xl">⚠️</div>
              <div>
                <div className="text-yellow-200 font-medium mb-1">Your Tax Strategy Right Now:</div>
                <div className="text-yellow-200/80 text-sm">
                  Track every expense. Document R&D work. File returns to bank your losses. That&apos;s it — the advanced stuff kicks in when you have revenue and payroll.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: Phase Overview */}
        <section id="phase-overview" className="mb-12">
          <h2 className="text-xl font-semibold text-[#f6e1bd] mb-4">Phase Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {phases.map((phase, index) => {
              const phaseProgress = getPhaseProgress(
                phase.id,
                checklists.filter((c) => c.phase === phase.id).map((c) => c.id)
              );
              return (
                <button
                  key={phase.id}
                  onClick={() => scrollToSection(`phase-${index + 1}` as SectionId)}
                  className={`${phase.bgColor} ${phase.borderColor} border rounded-xl p-4 text-left hover:scale-[1.02] transition-transform`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${phase.dotColor}`} />
                    <span className={`text-sm font-semibold ${phase.color}`}>Phase {index + 1}</span>
                  </div>
                  <div className="text-[#f6e1bd] font-medium mb-1">{phase.title}</div>
                  <div className="text-[#737373] text-xs mb-2">{phase.timeline}</div>
                  <div className={`text-xs ${phase.color} opacity-80`}>{phase.tag}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${phase.dotColor} transition-all duration-300`}
                        style={{ width: `${phaseProgress.percentage}%` }}
                      />
                    </div>
                    <span className="text-[#a3a3a3] text-xs">{phaseProgress.percentage}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* SECTION 4: Phase 1 — Pre-Launch */}
        <PhaseSection
          id="phase-1"
          phase={phases[0]}
          phaseNumber={1}
          revenueTarget={null}
          isCollapsed={isCollapsed("phase-1")}
          onToggle={() => toggleSection("phase-1")}
          isChecked={isChecked}
          toggleCheckbox={toggleCheckbox}
          infoBox={
            <InfoBox title={infoBoxes.preLaunch.title} color="blue">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {infoBoxes.preLaunch.items.map((item) => (
                  <div key={item.label} className="bg-blue-500/5 rounded-lg p-3">
                    <div className="text-blue-300 font-medium text-sm mb-1">{item.label}</div>
                    <div className="text-[#a3a3a3] text-xs">{item.desc}</div>
                  </div>
                ))}
              </div>
            </InfoBox>
          }
        />

        {/* SECTION 5: Phase 2 — Launch */}
        <PhaseSection
          id="phase-2"
          phase={phases[1]}
          phaseNumber={2}
          revenueTarget={{
            amount: "$100K - $300K ARR",
            detail: "20 partners × $400/month avg = ~$100K ARR | 50 partners = ~$240K ARR",
          }}
          isCollapsed={isCollapsed("phase-2")}
          onToggle={() => toggleSection("phase-2")}
          isChecked={isChecked}
          toggleCheckbox={toggleCheckbox}
          infoBox={
            <InfoBox title={infoBoxes.launch.title} color="green">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: "💊", label: "Health Insurance", desc: "Tax-free benefit" },
                  { icon: "🏦", label: "401(k)", desc: "Up to $70K/year tax-deferred" },
                  { icon: "🔬", label: "R&D Payroll Offset", desc: "Use credits NOW" },
                  { icon: "🏥", label: "HSA", desc: "$8,550/year tax-free" },
                ].map((item) => (
                  <div key={item.label} className="bg-emerald-500/5 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className="text-emerald-300 font-medium text-sm mb-1">{item.label}</div>
                    <div className="text-[#a3a3a3] text-xs">{item.desc}</div>
                  </div>
                ))}
              </div>
            </InfoBox>
          }
        />

        {/* SECTION 6: Phase 3 — Growth */}
        <PhaseSection
          id="phase-3"
          phase={phases[2]}
          phaseNumber={3}
          revenueTarget={{
            amount: "$500K - $1M ARR",
            detail: "100+ locations × $500/month avg = ~$600K ARR",
          }}
          isCollapsed={isCollapsed("phase-3")}
          onToggle={() => toggleSection("phase-3")}
          isChecked={isChecked}
          toggleCheckbox={toggleCheckbox}
          infoBox={
            <InfoBox title="Compensation Stacking Example" color="orange">
              <p className="text-[#a3a3a3] text-sm mb-3">
                Delivering $180K value with less tax leakage than straight salary
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2a2a2a]">
                      <th className="text-left py-2 text-[#737373] font-medium">Component</th>
                      <th className="text-right py-2 text-[#737373] font-medium">Amount</th>
                      <th className="text-right py-2 text-[#737373] font-medium">Taxable?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compensationStackingExample.map((row) => (
                      <tr key={row.component} className="border-b border-[#1f1f1f]">
                        <td className="py-2 text-[#f6e1bd]">{row.component}</td>
                        <td className="py-2 text-right text-[#a3a3a3]">{row.amount}</td>
                        <td className="py-2 text-right">
                          {row.taxable ? (
                            <span className="text-red-400">Yes</span>
                          ) : (
                            <span className="text-emerald-400">No{row.note ? ` (${row.note})` : ""}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td className="py-2 text-[#cb6b1e]">TOTAL VALUE</td>
                      <td className="py-2 text-right text-[#cb6b1e]">$181,800</td>
                      <td className="py-2 text-right text-[#a3a3a3]">Only $100K taxed</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </InfoBox>
          }
        />

        {/* SECTION 7: Phase 4 — Expansion + BBB */}
        <PhaseSection
          id="phase-4"
          phase={phases[3]}
          phaseNumber={4}
          revenueTarget={{
            amount: "$1.5M - $2M+ ARR",
            detail: "200+ locations × $700/month avg = ~$1.7M ARR",
          }}
          isCollapsed={isCollapsed("phase-4")}
          onToggle={() => toggleSection("phase-4")}
          isChecked={isChecked}
          toggleCheckbox={toggleCheckbox}
          customColumns={{
            tax: "Full Tax Optimization",
            compensation: "Better Baseball Bureau Launch",
          }}
          infoBox={
            <InfoBox title="BBB Tax Math" color="purple">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2a2a2a]">
                      <th className="text-left py-2 text-[#737373] font-medium">Baseline Profit</th>
                      <th className="text-right py-2 text-[#737373] font-medium">Max Donation (10%)</th>
                      <th className="text-right py-2 text-[#737373] font-medium">Tax Saved (21%)</th>
                      <th className="text-right py-2 text-[#737373] font-medium">Net Cost</th>
                      <th className="text-right py-2 text-[#737373] font-medium">Kids Helped</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bbbTaxMath.map((row) => (
                      <tr key={row.profit} className="border-b border-[#1f1f1f]">
                        <td className="py-2 text-[#f6e1bd]">{row.profit}</td>
                        <td className="py-2 text-right text-[#a3a3a3]">{row.maxDonation}</td>
                        <td className="py-2 text-right text-emerald-400">{row.taxSaved}</td>
                        <td className="py-2 text-right text-[#a3a3a3]">{row.netCost}</td>
                        <td className="py-2 text-right text-purple-300">{row.kidsHelped}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[#737373] text-xs mt-3 italic">
                Money goes to helping kids instead of the IRS. Same dollars, different destination.
              </p>
            </InfoBox>
          }
        />

        {/* SECTION 8: Revenue Milestone Triggers */}
        <section id="revenue-milestones" className="mb-12">
          <h2 className="text-xl font-semibold text-[#f6e1bd] mb-4">Revenue Milestone Triggers</h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-emerald-500 via-[#cb6b1e] to-purple-500" />
            <div className="space-y-6">
              {revenueMilestones.map((milestone, index) => (
                <div key={milestone.revenue} className="relative pl-12">
                  <div
                    className={`absolute left-2 w-5 h-5 rounded-full border-2 border-[#0a0a0a] ${
                      index === 0
                        ? "bg-blue-500"
                        : index === 1
                        ? "bg-emerald-500"
                        : index === 2
                        ? "bg-[#cb6b1e]"
                        : index === 3
                        ? "bg-orange-500"
                        : "bg-purple-500"
                    }`}
                  />
                  <div className="bg-[#0b0b0b] border border-[#1f1f1f] rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[#f6e1bd] font-bold text-lg">{milestone.revenue}</span>
                      <span className="text-[#737373] text-sm">({milestone.label})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {milestone.items.map((item) => (
                        <span
                          key={item}
                          className="px-2 py-1 bg-[#1f1f1f] text-[#a3a3a3] text-xs rounded-lg"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 9: Deductions vs Credits */}
        <section id="deductions-credits" className="mb-12">
          <h2 className="text-xl font-semibold text-[#f6e1bd] mb-4">Quick Reference — Deductions vs Credits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Deductions */}
            <div className="bg-[#0b0b0b] border border-[#1f1f1f] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <h3 className="text-[#f6e1bd] font-semibold">Deductions (21% Savings)</h3>
              </div>
              <p className="text-[#737373] text-sm mb-4">Reduce taxable income → Save 21% of amount</p>
              <div className="space-y-2">
                {deductionsReference.map((item) => (
                  <div key={item.item} className="flex justify-between text-sm">
                    <span className="text-[#a3a3a3]">
                      {item.item}: <span className="text-[#f6e1bd]">{item.example}</span>
                    </span>
                    <span className="text-emerald-400">{item.savings}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Credits */}
            <div className="bg-[#0b0b0b] border border-[#1f1f1f] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-[#cb6b1e]" />
                <h3 className="text-[#f6e1bd] font-semibold">Credits (Dollar-for-Dollar)</h3>
              </div>
              <p className="text-[#737373] text-sm mb-4">Reduce actual tax owed → Save full amount</p>
              <div className="space-y-2">
                {creditsReference.map((item) => (
                  <div key={item.item} className="flex justify-between text-sm">
                    <span className="text-[#a3a3a3]">{item.item}</span>
                    <span className="text-[#cb6b1e]">{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 10: Immediate Action Items */}
        <section id="immediate-actions" className="mb-12">
          <h2 className="text-xl font-semibold text-[#f6e1bd] mb-4">Immediate Action Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            {/* Legal/Entity */}
            <div className="bg-[#0b0b0b] border border-[#cb6b1e]/30 rounded-xl p-5">
              <h3 className="text-[#cb6b1e] font-semibold mb-3">Legal/Entity</h3>
              <div className="space-y-2">
                {immediateActions.legal.map((item) => (
                  <ChecklistItemComponent
                    key={item.id}
                    item={{ id: item.id, text: item.text } as ChecklistItem}
                    isChecked={isChecked(item.id)}
                    onToggle={() => toggleCheckbox(item.id)}
                  />
                ))}
              </div>
            </div>

            {/* Financial/Tax */}
            <div className="bg-[#0b0b0b] border border-[#cb6b1e]/30 rounded-xl p-5">
              <h3 className="text-[#cb6b1e] font-semibold mb-3">Financial/Tax</h3>
              <div className="space-y-2">
                {immediateActions.financial.map((item) => (
                  <ChecklistItemComponent
                    key={item.id}
                    item={{ id: item.id, text: item.text } as ChecklistItem}
                    isChecked={isChecked(item.id)}
                    onToggle={() => toggleCheckbox(item.id)}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <div className="flex gap-3">
              <div className="text-blue-400 text-xl">💡</div>
              <div className="text-blue-200 text-sm">
                Right now your only job is to track everything and build. The advanced tax strategies kick in when you have revenue and payroll. Don&apos;t overcomplicate it yet.
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 11: Tax Calendar */}
        <section id="tax-calendar" className="mb-12">
          <h2 className="text-xl font-semibold text-[#f6e1bd] mb-4">Annual Tax Calendar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {taxCalendar.map((quarter) => (
              <div
                key={quarter.quarter}
                className="bg-[#0b0b0b] border border-[#1f1f1f] rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[#cb6b1e]/20 text-[#cb6b1e] text-xs font-bold rounded">
                    {quarter.quarter}
                  </span>
                  <span className="text-[#737373] text-xs">{quarter.months}</span>
                </div>
                <ul className="space-y-2">
                  {quarter.items.map((item) => (
                    <li key={item} className="text-[#a3a3a3] text-sm flex items-start gap-2">
                      <span className="text-[#cb6b1e] mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#1f1f1f] pt-6 mt-12 print:mt-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-[#737373] text-sm">
              <span className="text-[#f6e1bd]">Baseline Analytics</span> — Year 1 Master Plan
            </div>
            <div className="text-[#737373] text-xs">
              Built January 2025 | Review & update quarterly
            </div>
          </div>
        </footer>
      </main>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .print-mode aside,
          .print-mode button,
          .print\\:hidden {
            display: none !important;
          }
          .print-mode main {
            margin-left: 0 !important;
            padding: 0.5in !important;
          }
          .print-mode {
            background: white !important;
          }
          .print-mode * {
            color: black !important;
            background: white !important;
            border-color: #ccc !important;
          }
          .print-mode h1,
          .print-mode h2,
          .print-mode h3 {
            color: #1a1a1a !important;
          }
        }
      `}</style>
    </div>
  );
}

// Phase Section Component
function PhaseSection({
  id,
  phase,
  phaseNumber,
  revenueTarget,
  isCollapsed,
  onToggle,
  isChecked,
  toggleCheckbox,
  infoBox,
  customColumns,
}: {
  id: string;
  phase: (typeof phases)[0];
  phaseNumber: number;
  revenueTarget: { amount: string; detail: string } | null;
  isCollapsed: boolean;
  onToggle: () => void;
  isChecked: (id: string) => boolean;
  toggleCheckbox: (id: string) => void;
  infoBox?: React.ReactNode;
  customColumns?: { tax?: string; compensation?: string; business?: string };
}) {
  const taxItems = getChecklistsByPhaseAndCategory(phase.id, "tax");
  const compItems = getChecklistsByPhaseAndCategory(phase.id, "compensation");
  const bizItems = getChecklistsByPhaseAndCategory(phase.id, "business");

  return (
    <section id={id} className="mb-12">
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 ${phase.bgColor} ${phase.borderColor} border rounded-xl mb-4 hover:scale-[1.005] transition-transform print:pointer-events-none`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${phase.dotColor}`} />
          <div className="text-left">
            <h2 className={`text-xl font-semibold ${phase.color}`}>
              Phase {phaseNumber} — {phase.title}
            </h2>
            <p className="text-[#737373] text-sm">{phase.timeline}</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 ${phase.color} transition-transform print:hidden ${isCollapsed ? "" : "rotate-180"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className={`${isCollapsed ? "hidden print:block" : "block"}`}>
        {/* Revenue Target Banner */}
        {revenueTarget && (
          <div className={`${phase.bgColor} ${phase.borderColor} border rounded-xl p-4 mb-4`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🎯</span>
              <span className={`font-semibold ${phase.color}`}>Revenue Target: {revenueTarget.amount}</span>
            </div>
            <p className="text-[#a3a3a3] text-sm">{revenueTarget.detail}</p>
          </div>
        )}

        {/* Three Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Tax Actions */}
          <div className="bg-[#0b0b0b] border border-[#1f1f1f] rounded-xl p-4">
            <h3 className={`font-medium ${phase.color} mb-3`}>
              {customColumns?.tax ?? "Tax Actions"}
            </h3>
            <div className="space-y-2">
              {taxItems.map((item) => (
                <ChecklistItemComponent
                  key={item.id}
                  item={item}
                  isChecked={isChecked(item.id)}
                  onToggle={() => toggleCheckbox(item.id)}
                />
              ))}
            </div>
          </div>

          {/* Compensation Actions */}
          <div className="bg-[#0b0b0b] border border-[#1f1f1f] rounded-xl p-4">
            <h3 className={`font-medium ${phase.color} mb-3`}>
              {customColumns?.compensation ?? "Compensation Actions"}
            </h3>
            <div className="space-y-2">
              {compItems.map((item) => (
                <ChecklistItemComponent
                  key={item.id}
                  item={item}
                  isChecked={isChecked(item.id)}
                  onToggle={() => toggleCheckbox(item.id)}
                />
              ))}
            </div>
          </div>

          {/* Business Actions */}
          {bizItems.length > 0 && (
            <div className="bg-[#0b0b0b] border border-[#1f1f1f] rounded-xl p-4">
              <h3 className={`font-medium ${phase.color} mb-3`}>
                {customColumns?.business ?? "Business Actions"}
              </h3>
              <div className="space-y-2">
                {bizItems.map((item) => (
                  <ChecklistItemComponent
                    key={item.id}
                    item={item}
                    isChecked={isChecked(item.id)}
                    onToggle={() => toggleCheckbox(item.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        {infoBox}
      </div>
    </section>
  );
}

// Checklist Item Component
function ChecklistItemComponent({
  item,
  isChecked,
  onToggle,
}: {
  item: { id: string; text: string };
  isChecked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer group">
      <div className="relative mt-0.5">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={onToggle}
          className="sr-only"
        />
        <div
          className={`w-4 h-4 rounded border transition-colors ${
            isChecked
              ? "bg-[#cb6b1e] border-[#cb6b1e]"
              : "border-[#3a3a3a] group-hover:border-[#cb6b1e]/50"
          }`}
        >
          {isChecked && (
            <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      <span
        className={`text-sm transition-colors ${
          isChecked ? "text-[#737373] line-through" : "text-[#a3a3a3] group-hover:text-[#f6e1bd]"
        }`}
      >
        {item.text}
      </span>
    </label>
  );
}

// Info Box Component
function InfoBox({
  title,
  color,
  children,
}: {
  title: string;
  color: "blue" | "green" | "orange" | "purple";
  children: React.ReactNode;
}) {
  const colorClasses = {
    blue: "bg-blue-500/5 border-blue-500/20",
    green: "bg-emerald-500/5 border-emerald-500/20",
    orange: "bg-[#cb6b1e]/5 border-[#cb6b1e]/20",
    purple: "bg-purple-500/5 border-purple-500/20",
  };

  const titleColors = {
    blue: "text-blue-300",
    green: "text-emerald-300",
    orange: "text-[#cb6b1e]",
    purple: "text-purple-300",
  };

  return (
    <div className={`${colorClasses[color]} border rounded-xl p-4`}>
      <h4 className={`${titleColors[color]} font-medium mb-3`}>{title}</h4>
      {children}
    </div>
  );
}
