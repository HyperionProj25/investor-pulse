"use client";

import React from "react";
import type { InvestorPersona } from "../lib/questionnaire";

type PersonalizedWelcomeProps = {
  investor: InvestorPersona;
  milestoneLabel: string;
};

const GRID_COLUMNS = 12;
const GRID_ROWS = 5;
const GRID_CELLS = Array.from(
  { length: GRID_COLUMNS * GRID_ROWS },
  (_, index) => index
);

const getDelay = (index: number) => {
  const colOffset = index % GRID_COLUMNS;
  const rowOffset = Math.floor(index / GRID_COLUMNS);
  return (colOffset * 0.045 + rowOffset * 0.12).toFixed(2);
};

const PersonalizedWelcome: React.FC<PersonalizedWelcomeProps> = ({
  investor,
  milestoneLabel,
}) => {
  const firstName = investor.name.split(" ")[0];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#262626] bg-gradient-to-br from-[#0d0d0d] via-[#121212] to-[#050505] p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="grid grid-cols-12 gap-1">
          {GRID_CELLS.map((index) => (
            <span
              key={index}
              className="pixel-spark block h-2 w-2 rounded-[2px] sm:h-2.5 sm:w-2.5"
              style={{
                animationDelay: `${getDelay(index)}s`,
                backgroundColor:
                  index % 5 === 0 ? investor.pixelAccent : investor.pixelMuted,
                opacity: index % 3 === 0 ? 0.95 : 0.35,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#292929] bg-[#0b0b0b]/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#cb6b1e]">
          Personalized
          <span className="h-1 w-1 rounded-full bg-[#cb6b1e]" />
          Investor view
        </div>

        <div className="space-y-1">
          <p className="text-xs text-[#a3a3a3]">
            Hi {firstName}, {investor.focusArea}
          </p>
          <h2 className="text-2xl font-semibold leading-snug text-[#f6e1bd]">
            {investor.welcomeNote}
          </h2>
        </div>

        <p className="text-sm text-[#d4d4d4]">{investor.highlight}</p>

        <div className="flex flex-wrap gap-2">
          {investor.keyQuestions.map((question) => (
            <span
              key={question}
              className="rounded-lg border border-[#262626] bg-[#0c0c0c]/80 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[#a3a3a3]"
            >
              {question}
            </span>
          ))}
        </div>

        <div className="rounded-xl border border-[#1e1e1e] bg-[#090909]/80 p-3 text-xs text-[#a3a3a3]">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Next step for {firstName}:{" "}
              <span className="text-[#f6e1bd]">{investor.nextStep}</span>
            </span>
            <span className="text-[#737373]">
              Countdown: {milestoneLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalizedWelcome;
