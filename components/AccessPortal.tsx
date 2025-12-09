"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { InvestorPersona } from "../lib/questionnaire";
import type { AdminUser } from "../lib/adminUsers";

type AccessMode = "investor" | "admin" | "deck";

type AccessPortalProps = {
  investors: InvestorPersona[];
  adminUsers: AdminUser[];
  pitchDeckPersona?: InvestorPersona | null;
  initialInvestorSlug?: string | null;
  onInvestorAuthenticated: (slug: string) => void;
};

const AccessPortal = ({
  investors,
  adminUsers,
  pitchDeckPersona,
  initialInvestorSlug,
  onInvestorAuthenticated,
}: AccessPortalProps) => {
  const router = useRouter();
  const [mode, setMode] = useState<AccessMode>("investor");
  const [rawSelectedInvestor, setRawSelectedInvestor] = useState<string>(
    initialInvestorSlug ?? ""
  );
  const [investorPin, setInvestorPin] = useState("");
  const [investorError, setInvestorError] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [adminError, setAdminError] = useState("");
  const [deckPin, setDeckPin] = useState("");
  const [deckError, setDeckError] = useState("");

  const selectedInvestor = useMemo(() => {
    if (
      rawSelectedInvestor &&
      investors.some((inv) => inv.slug === rawSelectedInvestor)
    ) {
      return rawSelectedInvestor;
    }
    if (
      initialInvestorSlug &&
      investors.some((inv) => inv.slug === initialInvestorSlug)
    ) {
      return initialInvestorSlug;
    }
    return investors[0]?.slug ?? "";
  }, [rawSelectedInvestor, investors, initialInvestorSlug]);

  const modeButton = (value: AccessMode, label: string) => (
    <button
      key={value}
      onClick={() => {
        setMode(value);
        setInvestorError("");
        setAdminError("");
        setDeckError("");
      }}
      className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
        mode === value
          ? "bg-[#cb6b1e] text-black"
          : "bg-[#141414] text-[#a3a3a3] hover:text-[#f6e1bd]"
      }`}
    >
      {label}
    </button>
  );

  const investorForm = (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!selectedInvestor) {
          setInvestorError("Select an investor profile to continue.");
          return;
        }
        const profile = investors.find((inv) => inv.slug === selectedInvestor);
        if (!profile) {
          setInvestorError("We couldn't find that investor profile.");
          return;
        }
        if (profile.pin !== investorPin.trim()) {
          setInvestorError("Incorrect PIN. Check your secure text and try again.");
          return;
        }
        setInvestorError("");
        setInvestorPin("");
        onInvestorAuthenticated(profile.slug);
      }}
    >
      <label className="block space-y-2 text-sm">
        <span className="text-[#a3a3a3]">Select investor</span>
        <div className="relative">
          <select
            value={selectedInvestor}
            onChange={(event) => setRawSelectedInvestor(event.target.value)}
            className="w-full appearance-none rounded-xl border border-[#262626] bg-[#050505] px-4 py-3 pr-10 text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
          >
            {investors.map((investor) => (
              <option key={investor.slug} value={investor.slug}>
                {investor.name} — {investor.firm}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6b6b6b]">
            v
          </span>
        </div>
      </label>
      <label className="block space-y-2 text-sm">
        <span className="text-[#a3a3a3]">PIN</span>
        <input
          type="password"
          value={investorPin}
          onChange={(event) => setInvestorPin(event.target.value)}
          placeholder="0000"
          className="w-full rounded-xl border border-[#262626] bg-[#050505] px-4 py-3 text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
          inputMode="numeric"
          autoComplete="one-time-code"
        />
      </label>
      {investorError && (
        <p className="text-xs text-[#f87171]" role="alert">
          {investorError}
        </p>
      )}
      <button
        type="submit"
        className="w-full rounded-xl bg-[#cb6b1e] py-3 text-sm font-semibold text-black transition-colors hover:bg-[#e37a2e]"
      >
        Unlock investor hub
      </button>
    </form>
  );

  const adminForm = (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!adminUsers.length) {
          setAdminError("No admin profiles available.");
          return;
        }
        const admin = adminUsers.find((user) => user.pin === adminPin.trim());
        if (!admin) {
          setAdminError("Invalid admin PIN. Try again.");
          return;
        }
        setAdminError("");
        setAdminPin("");
        if (typeof window !== "undefined") {
          window.localStorage.setItem("baseline-admin-user", admin.slug);
        }
        router.push("/admin");
      }}
    >
      <label className="block space-y-2 text-sm">
        <span className="text-[#a3a3a3]">Admin PIN</span>
        <input
          type="password"
          value={adminPin}
          onChange={(event) => setAdminPin(event.target.value)}
          placeholder="0000"
          className="w-full rounded-xl border border-[#262626] bg-[#050505] px-4 py-3 text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
          inputMode="numeric"
        />
      </label>
      {adminError && (
        <p className="text-xs text-[#f87171]" role="alert">
          {adminError}
        </p>
      )}
      <button
        type="submit"
        className="w-full rounded-xl bg-[#cb6b1e] py-3 text-sm font-semibold text-black transition-colors hover:bg-[#e37a2e]"
      >
        Open admin workspace
      </button>
    </form>
  );

  const deckForm = (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!pitchDeckPersona) {
          setDeckError("Pitch deck access is not configured yet.");
          return;
        }
        if (pitchDeckPersona.pin !== deckPin.trim()) {
          setDeckError("Invalid pitch deck PIN.");
          return;
        }
        setDeckError("");
        setDeckPin("");
        if (typeof window !== "undefined") {
          window.localStorage.setItem("pitch-deck-authenticated", "true");
        }
        router.push("/pitch-deck");
      }}
    >
      <label className="block space-y-2 text-sm">
        <span className="text-[#a3a3a3]">Pitch deck PIN</span>
        <input
          type="password"
          value={deckPin}
          onChange={(event) => setDeckPin(event.target.value)}
          placeholder="0000"
          className="w-full rounded-xl border border-[#262626] bg-[#050505] px-4 py-3 text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
          inputMode="numeric"
        />
      </label>
      {deckError && (
        <p className="text-xs text-[#f87171]" role="alert">
          {deckError}
        </p>
      )}
      <button
        type="submit"
        className="w-full rounded-xl bg-[#cb6b1e] py-3 text-sm font-semibold text-black transition-colors hover:bg-[#e37a2e]"
      >
        View pitch deck
      </button>
    </form>
  );

  return (
    <div className="min-h-screen bg-[#020202] text-[#f6e1bd] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#050505] to-[#0f0f0f] opacity-80" />
      <div className="relative w-full max-w-xl space-y-6 rounded-3xl border border-[#1f1f1f] bg-[#0b0b0b]/80 p-8 shadow-2xl">
        <div className="space-y-2 text-center">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#cb6b1e]">
            Secure access
          </p>
          <h1 className="text-2xl font-semibold">Baseline investor systems</h1>
          <p className="text-sm text-[#a3a3a3]">
            Choose your role to unlock either the investor hub, admin workspace, or pitch deck.
          </p>
        </div>
        <div className="flex gap-2">{["investor", "admin", "deck"].map((value) => {
          const label =
            value === "investor"
              ? "Investor"
              : value === "admin"
              ? "Admin"
              : "Pitch deck";
          return modeButton(value as AccessMode, label);
        })}</div>
        {mode === "investor" && investors.length === 0 ? (
          <p className="text-center text-sm text-[#f87171]">
            No investor profiles configured. Add one via the admin workspace.
          </p>
        ) : mode === "admin" ? (
          adminForm
        ) : mode === "deck" ? (
          deckForm
        ) : (
          investorForm
        )}
      </div>
    </div>
  );
};

export default AccessPortal;
