"use client";

import React, { useState, useEffect } from "react";
import type { InvestorPersona } from "@/lib/questionnaire";
import LogoBurstOverlay from "./LogoBurstOverlay";
import BaselineLogo from "./BaselineLogo";

type DickheadCounterProps = {
  isOpen: boolean;
  onClose: () => void;
  currentInvestor: InvestorPersona;
  allInvestors: InvestorPersona[];
  onSelfReport: () => void;
  hasReportedThisSession: boolean;
};

const DickheadCounter: React.FC<DickheadCounterProps> = ({
  isOpen,
  onClose,
  currentInvestor,
  allInvestors,
  onSelfReport,
  hasReportedThisSession,
}) => {
  const [isFirstDiscovery, setIsFirstDiscovery] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [burstSeed, setBurstSeed] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Check if this is first discovery
      const hasDiscovered = localStorage.getItem(`dickhead-discovered-${currentInvestor.slug}`);

      if (!hasDiscovered) {
        setIsFirstDiscovery(true);
        setBurstSeed(Date.now());
        localStorage.setItem(`dickhead-discovered-${currentInvestor.slug}`, "true");

        // Show content after burst animation
        setTimeout(() => {
          setShowContent(true);
        }, 3500);
      } else {
        setIsFirstDiscovery(false);
        setShowContent(true);
      }
    } else {
      setShowContent(false);
      setIsFirstDiscovery(false);
    }
  }, [isOpen, currentInvestor.slug]);

  if (!isOpen) return null;

  // Get leaderboard - only investors with showDickheadCounter enabled
  const leaderboard = allInvestors
    .filter((inv) => inv.showDickheadCounter)
    .sort((a, b) => (b.dickheadCount || 0) - (a.dickheadCount || 0));

  const currentRank = leaderboard.findIndex((inv) => inv.slug === currentInvestor.slug) + 1;
  const daysSinceIncident = 0; // You can calculate this based on last report timestamp if needed

  return (
    <>
      {/* Logo Burst Animation on first discovery */}
      {isFirstDiscovery && <LogoBurstOverlay seed={burstSeed} duration={3000} count={220} />}

      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-2xl mx-4 bg-[#0b0b0b] border border-[#262626] rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#a3a3a3] hover:text-[#f6e1bd] text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>

          {/* First Discovery Content */}
          {isFirstDiscovery && !showContent && (
            <div className="p-12 text-center space-y-6">
              <div className="flex justify-center">
                <BaselineLogo size="w-32 h-32" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-[#f6e1bd]">
                  You've found the hidden dickhead counter!
                </h2>
                <p className="text-lg text-[#cb6b1e]">
                  Welcome to Baseline Analytics
                </p>
              </div>
            </div>
          )}

          {/* Main Counter Content */}
          {showContent && (
            <div className="p-8 space-y-6">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-[#cb6b1e]">
                  Dickhead Counter
                </h2>

                {/* Current count for this investor */}
                <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 space-y-2">
                  <p className="text-sm text-[#a3a3a3] uppercase tracking-wider">
                    Your Count
                  </p>
                  <p className="text-6xl font-bold text-[#f6e1bd]">
                    {currentInvestor.dickheadCount || 0}
                  </p>
                  <p className="text-sm text-[#737373]">
                    Rank: #{currentRank} of {leaderboard.length}
                  </p>
                </div>

                {/* Days without incident */}
                <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg p-4">
                  <p className="text-xs text-[#a3a3a3] uppercase tracking-wider mb-1">
                    Days without incident
                  </p>
                  <p className="text-3xl font-semibold text-[#cb6b1e]">
                    {daysSinceIncident}
                  </p>
                </div>

                {/* Self-report button */}
                {!hasReportedThisSession ? (
                  <button
                    onClick={onSelfReport}
                    className="w-full bg-[#cb6b1e] hover:bg-[#d47b2e] text-black font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Self-Report Dickhead Moment
                  </button>
                ) : (
                  <div className="bg-[#121212] border border-[#262626] rounded-lg p-4">
                    <p className="text-sm text-[#f6e1bd] font-medium">
                      Thanks for being honest, ya dick.
                    </p>
                  </div>
                )}
              </div>

              {/* Leaderboard */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-[#f6e1bd] text-center">
                  Leaderboard
                </h3>
                <div className="bg-[#121212] border border-[#262626] rounded-xl overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    {leaderboard.map((investor, index) => (
                      <div
                        key={investor.slug}
                        className={`flex items-center justify-between p-4 border-b border-[#1f1f1f] last:border-b-0 ${
                          investor.slug === currentInvestor.slug
                            ? "bg-[#cb6b1e]/10"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-[#a3a3a3] w-8">
                            #{index + 1}
                          </span>
                          <div>
                            <p className="font-medium text-[#f6e1bd]">
                              {investor.name}
                              {investor.slug === currentInvestor.slug && (
                                <span className="ml-2 text-xs text-[#cb6b1e]">(You)</span>
                              )}
                            </p>
                            {investor.firm && (
                              <p className="text-xs text-[#737373]">{investor.firm}</p>
                            )}
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-[#cb6b1e]">
                          {investor.dickheadCount || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DickheadCounter;
