"use client";

import { useState } from "react";
import BaselineLogo from "./BaselineLogo";

type BrainTrustAgreementProps = {
  onAgree: () => void;
};

const BrainTrustAgreement: React.FC<BrainTrustAgreementProps> = ({ onAgree }) => {
  const [agreeing, setAgreeing] = useState(false);

  const handleAgree = async () => {
    setAgreeing(true);
    await onAgree();
    // onAgree will handle the state update and navigation
  };

  return (
    <div className="min-h-screen bg-[#020202] text-[#f6e1bd] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#050505] to-[#0f0f0f] opacity-80" />

      <div className="relative w-full max-w-3xl space-y-8 rounded-3xl border border-[#1f1f1f] bg-[#0b0b0b]/80 p-12 shadow-2xl">
        {/* Logo */}
        <div className="flex justify-center">
          <BaselineLogo size="w-24 h-24" />
        </div>

        {/* Headline */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-[#f6e1bd]">
            Welcome to the Baseline Analytics Brain Trust
          </h1>
        </div>

        {/* Body */}
        <div className="space-y-6 text-[#d4d4d4] leading-relaxed">
          <p>
            You've been granted access to a private view of Baseline Analytics—built for a small group of investors, partners, and trusted advisors who want real-time visibility into our progress and what we're building next.
          </p>

          <p>
            <span className="text-[#cb6b1e] font-semibold">Quick heads up:</span> we built this dashboard with AI, and it's still evolving. That means there may be a few bugs, gaps, or inconsistencies as we ship updates. If you see something off, assume it's a versioning issue—not intent. We'll keep polishing and tightening accuracy as quickly as we can.
          </p>

          <p>
            This dashboard is a snapshot of where Baseline Analytics stands today—what's built, what's in progress, and what's coming next. It will continue to expand and evolve as we move forward.
          </p>

          <p className="text-sm text-[#a3a3a3] italic border-l-2 border-[#cb6b1e] pl-4">
            This dashboard contains confidential information and is intended only for invited investors, partners, and trusted advisors. By continuing, you agree to keep all information on this page confidential.
          </p>

          <p className="text-center text-[#f6e1bd] font-medium">
            Thanks for being here. Let's build something great together.
          </p>
        </div>

        {/* Button */}
        <div className="flex justify-center pt-4">
          <button
            onClick={handleAgree}
            disabled={agreeing}
            className="w-full max-w-md rounded-xl bg-[#cb6b1e] py-4 text-base font-semibold text-black transition-colors hover:bg-[#e37a2e] disabled:opacity-60"
          >
            {agreeing ? "Processing..." : "I Understand & Agree"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrainTrustAgreement;
