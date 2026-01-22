"use client";

import { useEffect, useState, useMemo } from "react";
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
} from "@/lib/year1Plan";

// Step definitions
type StepId = "overview" | "phase-1" | "phase-2" | "phase-3" | "phase-4" | "resources";

interface Step {
  id: StepId;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  dotColor: string;
}

const steps: Step[] = [
  { id: "overview", label: "Overview & Current State", shortLabel: "Overview", icon: "📊", color: "text-[#f6e1bd]", dotColor: "bg-[#f6e1bd]" },
  { id: "phase-1", label: "Pre-Launch", shortLabel: "Phase 1", icon: "🏗️", color: "text-blue-400", dotColor: "bg-blue-500" },
  { id: "phase-2", label: "Launch", shortLabel: "Phase 2", icon: "🚀", color: "text-emerald-400", dotColor: "bg-emerald-500" },
  { id: "phase-3", label: "Growth", shortLabel: "Phase 3", icon: "📈", color: "text-[#cb6b1e]", dotColor: "bg-[#cb6b1e]" },
  { id: "phase-4", label: "Expansion + BBB", shortLabel: "Phase 4", icon: "🏆", color: "text-purple-400", dotColor: "bg-purple-500" },
  { id: "resources", label: "Resources & Calendar", shortLabel: "Resources", icon: "📚", color: "text-[#a3a3a3]", dotColor: "bg-[#a3a3a3]" },
];

export default function Year1PlanPage() {
  const router = useRouter();
  const [authorizedAdmin, setAuthorizedAdmin] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<StepId>("overview");

  const {
    isLoaded,
    toggleCheckbox,
    isChecked,
    getOverallProgress,
    exportState,
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

  // Get all checklist IDs for progress calculation
  const allChecklistIds = checklists.map((item) => item.id);
  const allImmediateIds = [
    ...immediateActions.legal.map((i) => i.id),
    ...immediateActions.financial.map((i) => i.id),
  ];
  const allIds = [...allChecklistIds, ...allImmediateIds];

  const overallProgress = getOverallProgress(allIds);

  // Calculate progress per phase
  const phaseProgress = useMemo(() => {
    const getPhaseItems = (phaseId: PhaseId) =>
      checklists.filter((c) => c.phase === phaseId).map((c) => c.id);

    return {
      "phase-1": getOverallProgress(getPhaseItems("pre-launch")),
      "phase-2": getOverallProgress(getPhaseItems("launch")),
      "phase-3": getOverallProgress(getPhaseItems("growth")),
      "phase-4": getOverallProgress(getPhaseItems("expansion")),
    };
  }, [getOverallProgress]);

  const getStepProgress = (stepId: StepId) => {
    if (stepId === "overview" || stepId === "resources") return null;
    return phaseProgress[stepId as keyof typeof phaseProgress];
  };

  const handlePrint = () => {
    window.print();
  };

  const goToNextStep = () => {
    const currentIndex = steps.findIndex((s) => s.id === activeStep);
    if (currentIndex < steps.length - 1) {
      setActiveStep(steps[currentIndex + 1].id);
    }
  };

  const goToPrevStep = () => {
    const currentIndex = steps.findIndex((s) => s.id === activeStep);
    if (currentIndex > 0) {
      setActiveStep(steps[currentIndex - 1].id);
    }
  };

  if (!authorizedAdmin || !isLoaded) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center">
        <div className="animate-pulse text-[#737373]">Loading...</div>
      </div>
    );
  }

  const currentStepIndex = steps.findIndex((s) => s.id === activeStep);
  const currentStep = steps[currentStepIndex];

  return (
    <div className="min-h-screen bg-[#020202] flex">
      {/* Fixed Left Sidebar - Vertical Stepper */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-[#0a0a0a] border-r border-[#1f1f1f] z-40 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#1f1f1f]">
          <Link
            href="/admin/partnerships"
            className="flex items-center gap-2 text-[#a3a3a3] hover:text-[#f6e1bd] transition-colors text-sm mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Partnerships
          </Link>
          <h1 className="text-[#f6e1bd] font-semibold text-lg">Year 1 Master Plan</h1>
          <p className="text-[#737373] text-xs mt-1">Taxes, Compensation & Growth</p>
        </div>

        {/* Overall Progress */}
        <div className="p-4 border-b border-[#1f1f1f]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#737373] uppercase tracking-wider">Overall Progress</span>
            <span className="text-[#cb6b1e] text-sm font-bold">{overallProgress.percentage}%</span>
          </div>
          <div className="h-2 bg-[#1f1f1f] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-emerald-500 via-[#cb6b1e] to-purple-500 transition-all duration-500"
              style={{ width: `${overallProgress.percentage}%` }}
            />
          </div>
          <div className="text-xs text-[#737373] mt-1">
            {overallProgress.completed} / {overallProgress.total} tasks
          </div>
        </div>

        {/* Step Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-[#1f1f1f]" />

            <div className="space-y-1">
              {steps.map((step, index) => {
                const progress = getStepProgress(step.id);
                const isActive = activeStep === step.id;
                const isCompleted = progress?.percentage === 100;

                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(step.id)}
                    className={`relative w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-[#1f1f1f] border border-[#2a2a2a]"
                        : "hover:bg-[#1f1f1f]/50"
                    }`}
                  >
                    {/* Step indicator dot */}
                    <div
                      className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCompleted
                          ? "bg-emerald-500 text-black"
                          : isActive
                          ? `${step.dotColor} text-black`
                          : "bg-[#1f1f1f] text-[#737373] border border-[#2a2a2a]"
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>

                    {/* Step content */}
                    <div className="flex-1 text-left">
                      <div className={`text-sm font-medium ${isActive ? step.color : "text-[#a3a3a3]"}`}>
                        {step.label}
                      </div>
                      {progress && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 bg-[#1f1f1f] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${step.dotColor} transition-all duration-300`}
                              style={{ width: `${progress.percentage}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-[#737373]">{progress.percentage}%</span>
                        </div>
                      )}
                    </div>

                    {/* Active indicator */}
                    {isActive && (
                      <div className={`w-1 h-8 ${step.dotColor} rounded-full`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#1f1f1f] space-y-2">
          <button
            onClick={exportState}
            className="w-full px-3 py-2 text-sm border border-[#2a2a2a] text-[#a3a3a3] rounded-lg hover:border-[#cb6b1e] hover:text-[#f6e1bd] transition-colors"
          >
            Export Progress
          </button>
          <button
            onClick={handlePrint}
            className="w-full px-3 py-2 text-sm bg-[#1f1f1f] text-[#f6e1bd] rounded-lg hover:bg-[#2a2a2a] transition-colors"
          >
            Print / PDF
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-72 flex-1 min-h-screen">
        {/* Content Header */}
        <div className="sticky top-0 z-30 bg-[#020202]/95 backdrop-blur-sm border-b border-[#1f1f1f] px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{currentStep.icon}</span>
              <div>
                <h2 className={`text-xl font-semibold ${currentStep.color}`}>{currentStep.label}</h2>
                <p className="text-[#737373] text-sm">
                  Step {currentStepIndex + 1} of {steps.length}
                </p>
              </div>
            </div>

            {/* Step Navigation Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevStep}
                disabled={currentStepIndex === 0}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentStepIndex === 0
                    ? "text-[#3a3a3a] cursor-not-allowed"
                    : "border border-[#2a2a2a] text-[#a3a3a3] hover:border-[#cb6b1e] hover:text-[#f6e1bd]"
                }`}
              >
                ← Previous
              </button>
              <button
                onClick={goToNextStep}
                disabled={currentStepIndex === steps.length - 1}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentStepIndex === steps.length - 1
                    ? "text-[#3a3a3a] cursor-not-allowed"
                    : "bg-[#cb6b1e] text-black hover:bg-[#e37a2e]"
                }`}
              >
                Next →
              </button>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-8 max-w-4xl">
          {activeStep === "overview" && (
            <OverviewStep currentState={currentState} revenueMilestones={revenueMilestones} />
          )}

          {activeStep === "phase-1" && (
            <PhaseStep
              phase={phases[0]}
              phaseNumber={1}
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
          )}

          {activeStep === "phase-2" && (
            <PhaseStep
              phase={phases[1]}
              phaseNumber={2}
              revenueTarget={{
                amount: "$100K - $300K ARR",
                detail: "20 partners × $400/month avg = ~$100K ARR | 50 partners = ~$240K ARR",
              }}
              isChecked={isChecked}
              toggleCheckbox={toggleCheckbox}
              infoBox={
                <InfoBox title="What Unlocks With Salaries" color="green">
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
          )}

          {activeStep === "phase-3" && (
            <PhaseStep
              phase={phases[2]}
              phaseNumber={3}
              revenueTarget={{
                amount: "$500K - $1M ARR",
                detail: "100+ locations × $500/month avg = ~$600K ARR",
              }}
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
          )}

          {activeStep === "phase-4" && (
            <PhaseStep
              phase={phases[3]}
              phaseNumber={4}
              revenueTarget={{
                amount: "$1.5M - $2M+ ARR",
                detail: "200+ locations × $700/month avg = ~$1.7M ARR",
              }}
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
                          <th className="text-left py-2 text-[#737373] font-medium">Profit</th>
                          <th className="text-right py-2 text-[#737373] font-medium">Max Donation</th>
                          <th className="text-right py-2 text-[#737373] font-medium">Tax Saved</th>
                          <th className="text-right py-2 text-[#737373] font-medium">Net Cost</th>
                          <th className="text-right py-2 text-[#737373] font-medium">Impact</th>
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
          )}

          {activeStep === "resources" && (
            <ResourcesStep
              immediateActions={immediateActions}
              taxCalendar={taxCalendar}
              deductionsReference={deductionsReference}
              creditsReference={creditsReference}
              isChecked={isChecked}
              toggleCheckbox={toggleCheckbox}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// Overview Step Component
function OverviewStep({
  currentState,
  revenueMilestones,
}: {
  currentState: typeof import("@/lib/year1Plan").currentState;
  revenueMilestones: typeof import("@/lib/year1Plan").revenueMilestones;
}) {
  return (
    <div className="space-y-8">
      {/* Current State */}
      <div>
        <h3 className="text-lg font-semibold text-[#f6e1bd] mb-4">Current State Assessment (January 2025)</h3>
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
      </div>

      {/* Revenue Milestones */}
      <div>
        <h3 className="text-lg font-semibold text-[#f6e1bd] mb-4">Revenue Milestone Triggers</h3>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-emerald-500 via-[#cb6b1e] to-purple-500" />
          <div className="space-y-4">
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
                    <span className="text-[#f6e1bd] font-bold">{milestone.revenue}</span>
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
      </div>

      {/* Phase Overview Cards */}
      <div>
        <h3 className="text-lg font-semibold text-[#f6e1bd] mb-4">The 4 Phases</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {phases.map((phase, index) => (
            <div
              key={phase.id}
              className={`${phase.bgColor} ${phase.borderColor} border rounded-xl p-4`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${phase.dotColor}`} />
                <span className={`text-sm font-semibold ${phase.color}`}>Phase {index + 1}</span>
              </div>
              <div className="text-[#f6e1bd] font-medium mb-1">{phase.title}</div>
              <div className="text-[#737373] text-xs mb-2">{phase.timeline}</div>
              <div className={`text-xs ${phase.color} opacity-80`}>{phase.tag}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Phase Step Component
function PhaseStep({
  phase,
  phaseNumber,
  revenueTarget,
  isChecked,
  toggleCheckbox,
  infoBox,
  customColumns,
}: {
  phase: (typeof phases)[0];
  phaseNumber: number;
  revenueTarget?: { amount: string; detail: string };
  isChecked: (id: string) => boolean;
  toggleCheckbox: (id: string) => void;
  infoBox?: React.ReactNode;
  customColumns?: { tax?: string; compensation?: string; business?: string };
}) {
  const taxItems = getChecklistsByPhaseAndCategory(phase.id, "tax");
  const compItems = getChecklistsByPhaseAndCategory(phase.id, "compensation");
  const bizItems = getChecklistsByPhaseAndCategory(phase.id, "business");

  return (
    <div className="space-y-6">
      {/* Timeline */}
      <div className={`${phase.bgColor} ${phase.borderColor} border rounded-xl p-4`}>
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-3 h-3 rounded-full ${phase.dotColor}`} />
          <span className={`font-semibold ${phase.color}`}>{phase.timeline}</span>
        </div>
        <div className={`text-sm ${phase.color} opacity-80`}>{phase.tag}</div>
      </div>

      {/* Revenue Target */}
      {revenueTarget && (
        <div className={`${phase.bgColor} ${phase.borderColor} border rounded-xl p-4`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🎯</span>
            <span className={`font-semibold ${phase.color}`}>Revenue Target: {revenueTarget.amount}</span>
          </div>
          <p className="text-[#a3a3a3] text-sm">{revenueTarget.detail}</p>
        </div>
      )}

      {/* Checklists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tax Actions */}
        <div className="bg-[#0b0b0b] border border-[#1f1f1f] rounded-xl p-4">
          <h4 className={`font-medium ${phase.color} mb-3`}>
            {customColumns?.tax ?? "Tax Actions"}
          </h4>
          <div className="space-y-2">
            {taxItems.map((item) => (
              <ChecklistItem
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
          <h4 className={`font-medium ${phase.color} mb-3`}>
            {customColumns?.compensation ?? "Compensation Actions"}
          </h4>
          <div className="space-y-2">
            {compItems.map((item) => (
              <ChecklistItem
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
            <h4 className={`font-medium ${phase.color} mb-3`}>
              {customColumns?.business ?? "Business Actions"}
            </h4>
            <div className="space-y-2">
              {bizItems.map((item) => (
                <ChecklistItem
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
  );
}

// Resources Step Component
function ResourcesStep({
  immediateActions,
  taxCalendar,
  deductionsReference,
  creditsReference,
  isChecked,
  toggleCheckbox,
}: {
  immediateActions: typeof import("@/lib/year1Plan").immediateActions;
  taxCalendar: typeof import("@/lib/year1Plan").taxCalendar;
  deductionsReference: typeof import("@/lib/year1Plan").deductionsReference;
  creditsReference: typeof import("@/lib/year1Plan").creditsReference;
  isChecked: (id: string) => boolean;
  toggleCheckbox: (id: string) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Immediate Action Items */}
      <div>
        <h3 className="text-lg font-semibold text-[#f6e1bd] mb-4">Immediate Action Items</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-[#0b0b0b] border border-[#cb6b1e]/30 rounded-xl p-4">
            <h4 className="text-[#cb6b1e] font-semibold mb-3">Legal/Entity</h4>
            <div className="space-y-2">
              {immediateActions.legal.map((item) => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  isChecked={isChecked(item.id)}
                  onToggle={() => toggleCheckbox(item.id)}
                />
              ))}
            </div>
          </div>
          <div className="bg-[#0b0b0b] border border-[#cb6b1e]/30 rounded-xl p-4">
            <h4 className="text-[#cb6b1e] font-semibold mb-3">Financial/Tax</h4>
            <div className="space-y-2">
              {immediateActions.financial.map((item) => (
                <ChecklistItem
                  key={item.id}
                  item={item}
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
      </div>

      {/* Deductions vs Credits */}
      <div>
        <h3 className="text-lg font-semibold text-[#f6e1bd] mb-4">Deductions vs Credits</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#0b0b0b] border border-[#1f1f1f] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <h4 className="text-[#f6e1bd] font-semibold">Deductions (21% Savings)</h4>
            </div>
            <p className="text-[#737373] text-sm mb-3">Reduce taxable income → Save 21% of amount</p>
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
          <div className="bg-[#0b0b0b] border border-[#1f1f1f] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-[#cb6b1e]" />
              <h4 className="text-[#f6e1bd] font-semibold">Credits (Dollar-for-Dollar)</h4>
            </div>
            <p className="text-[#737373] text-sm mb-3">Reduce actual tax owed → Save full amount</p>
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
      </div>

      {/* Tax Calendar */}
      <div>
        <h3 className="text-lg font-semibold text-[#f6e1bd] mb-4">Annual Tax Calendar</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <span className="text-[#cb6b1e] mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Checklist Item Component
function ChecklistItem({
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
      <div className="relative mt-0.5 flex-shrink-0">
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
