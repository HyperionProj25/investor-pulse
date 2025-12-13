"use client";

import { useMemo, useState, useId } from "react";
import { useRouter } from "next/navigation";
import { AUTH_ERRORS, NETWORK_ERRORS, VALIDATION_ERRORS, getUserFriendlyError } from "../lib/errorMessages";

type AccessMode = "investor" | "admin" | "deck";

// Minimal investor info needed for the login dropdown
type InvestorForLogin = {
  slug: string;
  name: string;
  firm: string;
  title?: string;
};

type AccessPortalProps = {
  investors: InvestorForLogin[];
  initialInvestorSlug?: string | null;
  onInvestorAuthenticated: (slug: string) => void;
};

const AccessPortal = ({
  investors,
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
  const [submitting, setSubmitting] = useState(false);
  const investorSelectId = useId();
  const investorPinId = useId();
  const adminPinId = useId();
  const deckPinId = useId();
  const investorErrorId = useId();
  const adminErrorId = useId();
  const deckErrorId = useId();

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
      aria-pressed={mode === value}
      aria-label={`Select ${label} access`}
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
    onSubmit={async (event) => {
      event.preventDefault();
      if (!selectedInvestor) {
        setInvestorError(VALIDATION_ERRORS.INVESTOR_SELECTION_REQUIRED);
        return;
      }
      setInvestorError("");
      setSubmitting(true);
      try {
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "investor",
            slug: selectedInvestor,
            pin: investorPin.trim(),
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          setInvestorError(
            getUserFriendlyError(data?.error, NETWORK_ERRORS.SESSION_REQUEST_FAILED)
          );
          return;
        }
        setInvestorPin("");
        onInvestorAuthenticated(data.slug);
      } catch (error) {
        console.error("Investor login failed:", error);
        setInvestorError(NETWORK_ERRORS.PIN_VERIFICATION_FAILED);
      } finally {
        setSubmitting(false);
      }
    }}
  >
    <label
      htmlFor={investorSelectId}
      className="block text-sm text-[#a3a3a3]"
    >
      Select investor
    </label>
    <div className="relative mt-2">
      <select
        id={investorSelectId}
        value={selectedInvestor}
        onChange={(event) => setRawSelectedInvestor(event.target.value)}
        className="w-full appearance-none rounded-xl border border-[#262626] bg-[#050505] px-4 py-3 pr-10 text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
        aria-describedby={investorError ? investorErrorId : undefined}
      >
        {investors.map((investor) => (
          <option key={investor.slug} value={investor.slug}>
            {investor.name} - {investor.firm}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#f6e1bd]"
        aria-hidden="true"
      >
        v
      </span>
    </div>
    <label
      htmlFor={investorPinId}
      className="mt-4 block text-sm text-[#a3a3a3]"
    >
      PIN
    </label>
    <input
      id={investorPinId}
      type="password"
      value={investorPin}
      onChange={(event) => setInvestorPin(event.target.value)}
      placeholder="0000"
      className="mt-2 w-full rounded-xl border border-[#262626] bg-[#050505] px-4 py-3 text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
      inputMode="numeric"
      autoComplete="one-time-code"
      disabled={submitting}
      aria-invalid={Boolean(investorError)}
      aria-describedby={investorError ? investorErrorId : undefined}
    />
    {investorError && (
      <p
        id={investorErrorId}
        className="text-xs text-[#f87171]"
        role="alert"
        aria-live="assertive"
      >
        {investorError}
      </p>
    )}
    <button
      type="submit"
      disabled={submitting}
      className="w-full rounded-xl bg-[#cb6b1e] py-3 text-sm font-semibold text-black transition-colors hover:bg-[#e37a2e] disabled:opacity-60"
    >
      {submitting ? "Processing..." : "Unlock investor hub"}
    </button>
  </form>
);

const adminForm = (
  <form
    className="space-y-4"
    onSubmit={async (event) => {
      event.preventDefault();
      setAdminError("");
      setSubmitting(true);
      try {
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "admin",
            pin: adminPin.trim(),
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          setAdminError(getUserFriendlyError(data?.error, AUTH_ERRORS.ADMIN_PIN_INVALID));
          return;
        }
        setAdminPin("");
        router.push("/admin");
      } catch (error) {
        console.error("Admin login failed:", error);
        setAdminError(NETWORK_ERRORS.PIN_VERIFICATION_FAILED);
      } finally {
        setSubmitting(false);
      }
    }}
  >
    <label htmlFor={adminPinId} className="block text-sm text-[#a3a3a3]">
      Admin PIN
    </label>
    <input
      id={adminPinId}
      type="password"
      value={adminPin}
      onChange={(event) => setAdminPin(event.target.value)}
      placeholder="0000"
      className="mt-2 w-full rounded-xl border border-[#262626] bg-[#050505] px-4 py-3 text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
      inputMode="numeric"
      disabled={submitting}
      aria-invalid={Boolean(adminError)}
      aria-describedby={adminError ? adminErrorId : undefined}
    />
    {adminError && (
      <p
        id={adminErrorId}
        className="text-xs text-[#f87171]"
        role="alert"
        aria-live="assertive"
      >
        {adminError}
      </p>
    )}
    <button
      type="submit"
      disabled={submitting}
      className="w-full rounded-xl bg-[#cb6b1e] py-3 text-sm font-semibold text-black transition-colors hover:bg-[#e37a2e] disabled:opacity-60"
    >
      {submitting ? "Processing..." : "Open admin workspace"}
    </button>
  </form>
);

const deckForm = (
  <form
    className="space-y-4"
    onSubmit={async (event) => {
      event.preventDefault();
      setDeckError("");
      setSubmitting(true);
      try {
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "deck",
            pin: deckPin.trim(),
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          setDeckError(getUserFriendlyError(data?.error, AUTH_ERRORS.DECK_PIN_INVALID));
          return;
        }
        setDeckPin("");
        router.push("/pitch-deck");
      } catch (error) {
        console.error("Pitch deck login failed:", error);
        setDeckError(NETWORK_ERRORS.PIN_VERIFICATION_FAILED);
      } finally {
        setSubmitting(false);
      }
    }}
  >
    <label htmlFor={deckPinId} className="block text-sm text-[#a3a3a3]">
      Pitch deck PIN
    </label>
    <input
      id={deckPinId}
      type="password"
      value={deckPin}
      onChange={(event) => setDeckPin(event.target.value)}
      placeholder="0000"
      className="mt-2 w-full rounded-xl border border-[#262626] bg-[#050505] px-4 py-3 text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
      inputMode="numeric"
      disabled={submitting}
      aria-invalid={Boolean(deckError)}
      aria-describedby={deckError ? deckErrorId : undefined}
    />
    {deckError && (
      <p
        id={deckErrorId}
        className="text-xs text-[#f87171]"
        role="alert"
        aria-live="assertive"
      >
        {deckError}
      </p>
    )}
    <button
      type="submit"
      disabled={submitting}
      className="w-full rounded-xl bg-[#cb6b1e] py-3 text-sm font-semibold text-black transition-colors hover:bg-[#e37a2e] disabled:opacity-60"
    >
      {submitting ? "Processing..." : "View pitch deck"}
    </button>
  </form>
);

  return (
    <div
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-[#020202] text-[#f6e1bd] flex items-center justify-center px-4 relative overflow-hidden"
    >
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
            {`${VALIDATION_ERRORS.INVESTOR_CONFIGURATION_REQUIRED} ${VALIDATION_ERRORS.INVESTOR_CONFIGURATION_GUIDANCE}`}
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
