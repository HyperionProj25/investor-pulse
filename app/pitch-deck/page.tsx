"use client";

import { useState, useEffect, useRef } from "react";
import { PitchDeckContent, PitchDeckSlide, sortSlides, moveSlide, generateSlideId } from "@/lib/pitchDeck";
import { BASELINE_UPDATE } from "@/lib/questionnaire";
import { ADMIN_PERSONAS } from "@/lib/adminUsers";
import BaselineLogo from "@/components/BaselineLogo";
import { formatPitchDeckText } from "@/lib/formatPitchDeckText";

type FormattingHelperProps = {
  compact?: boolean;
};

const FormattingHelper = ({ compact = false }: FormattingHelperProps) => (
  <div
    className={`rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-[#a3a3a3] ${
      compact ? "text-[11px]" : "text-xs"
    }`}
  >
    {!compact && (
      <p className="font-semibold uppercase tracking-[0.3em] text-[#cb6b1e]">
        Formatting Key
      </p>
    )}
    <p className={compact ? "mt-1" : "mt-2"}>
      Use Markdown-style shortcuts to format text quickly:
    </p>
    <ul className="mt-2 space-y-1 text-[#f6e1bd]">
      <li>
        <code className="rounded bg-black/30 px-1">#</code> Heading · <code className="rounded bg-black/30 px-1">##</code> Subheading
      </li>
      <li>
        <code className="rounded bg-black/30 px-1">**bold**</code> · <code className="rounded bg-black/30 px-1">*italic*</code>
      </li>
      <li>
        <code className="rounded bg-black/30 px-1">- bullet item</code> · <code className="rounded bg-black/30 px-1">1. numbered item</code>
      </li>
      <li>
        <code className="rounded bg-black/30 px-1">[link](https://example.com)</code> for hyperlinks
      </li>
      <li>
        Use blank lines to create paragraphs or break text.
      </li>
    </ul>
  </div>
);

const getCountdownDateInput = (isoValue: string | undefined) => {
  if (!isoValue) {
    return "";
  }
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const getCountdownTimeInput = (isoValue: string | undefined) => {
  if (!isoValue) {
    return "";
  }
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(11, 16);
};

const combineCountdownInputs = (dateValue: string, timeValue: string) => {
  if (!dateValue) {
    return "";
  }
  const normalizedTime = `${timeValue && timeValue.length > 0 ? timeValue : "00:00"}:00`;
  const local = new Date(`${dateValue}T${normalizedTime}`);
  if (Number.isNaN(local.getTime())) {
    return "";
  }
  return local.toISOString();
};

export default function PitchDeckPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [content, setContent] = useState<PitchDeckContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [formState, setFormState] = useState<PitchDeckContent | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [previewMode, setPreviewMode] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<{ [key: string]: boolean }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find the PRE PITCH DECK investor
  const pitchDeckInvestor = BASELINE_UPDATE.investors.find(
    (inv) => inv.slug === "pre-pitch-deck"
  );

  // Load pitch deck data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch("/api/pitch-deck");
        const data = await res.json();
        if (data.payload) {
          setContent(data.payload);
          setFormState(data.payload);
        }
      } catch (error) {
        console.error("Error loading pitch deck:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!content) return;

    const updateCountdown = () => {
      const targetDate = new Date(content.countdown.targetDate);
      if (Number.isNaN(targetDate.getTime())) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const now = Date.now();
      const diff = targetDate.getTime() - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [content]);

  // Handle authentication
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pitchDeckInvestor && pin === pitchDeckInvestor.pin) {
      setAuthenticated(true);
      localStorage.setItem("pitch-deck-authenticated", "true");
    } else {
      alert("Invalid PIN");
      setPin("");
    }
  };

  // Check for existing auth
  useEffect(() => {
    const stored = localStorage.getItem("pitch-deck-authenticated");
    if (stored === "true") {
      setAuthenticated(true);
    }
  }, []);

  // Keyboard navigation for carousel
  useEffect(() => {
    if (content?.displayMode !== "carousel" || !authenticated) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setCurrentSlideIndex((prev) =>
          prev > 0 ? prev - 1 : (content?.slides.length || 1) - 1
        );
      } else if (e.key === "ArrowRight") {
        setCurrentSlideIndex((prev) =>
          prev < (content?.slides.length || 1) - 1 ? prev + 1 : 0
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [content, authenticated]);

  // Handle admin authentication
  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();

    const adminUser = ADMIN_PERSONAS.find(
      (admin) => admin.pin === adminPin
    );

    if (adminUser) {
      setEditMode(true);
      setShowAdminAuth(false);
      setAdminPin("");
    } else {
      alert("Invalid admin PIN");
      setAdminPin("");
    }
  };

  // Save pitch deck
  const handleSave = async () => {
    if (!formState) return;

    setSaveStatus("saving");

    try {
      const res = await fetch("/api/pitch-deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: formState,
          author: "Admin",
          notes: "Pitch deck update",
        }),
      });

      if (res.ok) {
        setContent(formState);
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      console.error("Error saving:", error);
      setSaveStatus("error");
    }
  };

  // Add new slide
  const handleAddSlide = (type: "pdf" | "text" | "video") => {
    if (!formState) return;

    const newSlide: PitchDeckSlide = {
      id: generateSlideId(),
      type,
      order: formState.slides.length,
      textContent: type === "text" ? "# New Slide\n\nAdd your content here..." : undefined,
      textPosition: type === "text" ? "full" : undefined,
      videoAutoplay: type === "video" ? true : undefined,
    };

    setFormState({
      ...formState,
      slides: [...formState.slides, newSlide],
    });
  };

  // Delete slide
  const handleDeleteSlide = (slideId: string) => {
    if (!formState) return;

    const filtered = formState.slides.filter((s) => s.id !== slideId);
    // Re-order remaining slides
    const reordered = filtered.map((s, idx) => ({ ...s, order: idx }));

    setFormState({
      ...formState,
      slides: reordered,
    });
  };

  // Move slide up/down
  const handleMoveSlide = (slideId: string, direction: "up" | "down") => {
    if (!formState) return;

    const moved = moveSlide(formState.slides, slideId, direction);
    setFormState({
      ...formState,
      slides: moved,
    });
  };

  // Update slide
  const handleUpdateSlide = (slideId: string, updates: Partial<PitchDeckSlide>) => {
    if (!formState) return;

    setFormState({
      ...formState,
      slides: formState.slides.map((s) => (s.id === slideId ? { ...s, ...updates } : s)),
    });
  };

  // Handle file upload
  const handleFileUpload = async (slideId: string, file: File, fileType: "pdf" | "video") => {
    if (!file) return;

    setUploadingFiles((prev) => ({ ...prev, [slideId]: true }));

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/pitch-deck/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Upload failed: ${errorData.error || "Unknown error"}`);
        return;
      }

      const data = await response.json();

      // Update the slide with the uploaded file URL
      if (fileType === "pdf") {
        handleUpdateSlide(slideId, {
          pdfUrl: data.url,
          pdfFileName: data.fileName,
        });
      } else if (fileType === "video") {
        handleUpdateSlide(slideId, {
          videoUrl: data.url,
          videoSource: "upload",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [slideId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#f6e1bd]">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 w-16 h-16">
                <BaselineLogo size="w-16 h-16" />
              </div>
              <h1 className="text-3xl font-bold text-[#f6e1bd] mb-2">Baseline Analytics</h1>
              <p className="text-[#f6e1bd]">Pitch Deck Access</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#f6e1bd] mb-2">
                  Access PIN
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-[#f6e1bd] focus:outline-none focus:border-[#cb6b1e] transition-colors"
                  placeholder="Enter 4-digit PIN"
                  maxLength={4}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#cb6b1e] hover:bg-[#e37a2e] text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Access Deck
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#f6e1bd] mb-4">No pitch deck content available</div>
          <div className="text-[#a3a3a3] text-sm mb-6">
            Database tables may not be set up yet. Check PITCH_DECK_SETUP.md for instructions.
          </div>
          <button
            onClick={() => {
              setAuthenticated(false);
              localStorage.removeItem("pitch-deck-authenticated");
              setPin("");
            }}
            className="bg-[#cb6b1e] hover:bg-[#e37a2e] text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const sortedSlides = sortSlides(content.slides);
  const displaySlides = editMode && formState ? sortSlides(formState.slides) : sortedSlides;
  const currentDisplayMode = editMode && formState ? formState.displayMode : content.displayMode;
  const resolvedTagline =
    ((editMode && formState ? formState.tagline : content.tagline) ?? "").trim() ||
    "Data **Redefined.**";
  const resolvedCountdownLabel =
    ((editMode && formState ? formState.countdown?.label : content.countdown.label) ?? "").trim() ||
    "Launch milestone";
  const countdownDateValue = formState
    ? getCountdownDateInput(formState.countdown?.targetDate)
    : "";
  const countdownTimeValue = formState
    ? getCountdownTimeInput(formState.countdown?.targetDate)
    : "";

  const updateCountdownField = (field: "label" | "targetDate", value: string) => {
    setFormState((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        countdown: {
          ...prev.countdown,
          [field]: value,
        },
      };
    });
  };

  const handleCountdownDateChange = (value: string) => {
    setFormState((prev) => {
      if (!prev) {
        return prev;
      }
      const existingTime = getCountdownTimeInput(prev.countdown?.targetDate);
      return {
        ...prev,
        countdown: {
          ...prev.countdown,
          targetDate: combineCountdownInputs(value, existingTime),
        },
      };
    });
  };

  const handleCountdownTimeChange = (value: string) => {
    setFormState((prev) => {
      if (!prev) {
        return prev;
      }
      const existingDate = getCountdownDateInput(prev.countdown?.targetDate);
      return {
        ...prev,
        countdown: {
          ...prev.countdown,
          targetDate: combineCountdownInputs(existingDate, value),
        },
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#cb6b1e]/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#cb6b1e]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(#cb6b1e 1px, transparent 1px), linear-gradient(90deg, #cb6b1e 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Hero Header */}
      <div className="relative border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20">
            <BaselineLogo size="w-20 h-20" />
          </div>
          {editMode && formState ? (
            <div className="space-y-4 w-full max-w-2xl">
              <textarea
                value={formState.title}
                onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#f6e1bd] text-lg font-mono text-center focus:outline-none focus:border-[#cb6b1e]/50 min-h-[80px]"
                placeholder="Hero title (markdown supported, e.g., # Baseline Analytics)"
              />
              <textarea
                value={formState.tagline ?? ""}
                onChange={(e) => setFormState({ ...formState, tagline: e.target.value })}
                placeholder="Tagline (markdown supported, e.g., Data **Redefined.**)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#f6e1bd] text-base font-mono text-center focus:outline-none focus:border-[#cb6b1e]/50 min-h-[60px]"
              />
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-1 text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                  Countdown label
                  <input
                    type="text"
                    value={formState.countdown?.label ?? ""}
                    onChange={(e) => updateCountdownField("label", e.target.value)}
                    placeholder="Launch milestone"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[#f6e1bd] text-sm text-center focus:outline-none focus:border-[#cb6b1e]/50"
                  />
                </label>
                <label className="space-y-1 text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                  Target date
                  <input
                    type="date"
                    value={countdownDateValue}
                    onChange={(e) => handleCountdownDateChange(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[#f6e1bd] text-sm text-center focus:outline-none focus:border-[#cb6b1e]/50"
                  />
                </label>
                <label className="space-y-1 text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                  Target time
                  <input
                    type="time"
                    value={countdownTimeValue}
                    onChange={(e) => handleCountdownTimeChange(e.target.value)}
                    step="300"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[#f6e1bd] text-sm text-center focus:outline-none focus:border-[#cb6b1e]/50"
                  />
                </label>
              </div>
              <FormattingHelper />
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl">
              <div
                className="text-4xl md:text-5xl font-semibold leading-tight text-[#f6e1bd] space-y-2"
                dangerouslySetInnerHTML={{
                  __html: formatPitchDeckText(content.title || "Baseline Analytics"),
                }}
              />
              <div
                className="text-lg md:text-xl text-[#d4d4d4] font-medium"
                dangerouslySetInnerHTML={{
                  __html: formatPitchDeckText(resolvedTagline),
                }}
              />
            </div>
          )}
          <div className="text-xs uppercase tracking-[0.35em] text-[#cb6b1e]">
            {resolvedCountdownLabel}
          </div>
          {/* Countdown - Horizontal Glass Card */}
          <div className="inline-flex flex-wrap justify-center items-center gap-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 shadow-lg">
            <div className="text-sm text-[#a3a3a3] uppercase tracking-wide font-medium">
              Countdown
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#cb6b1e] font-mono">{countdown.days}</div>
                <div className="text-xs text-[#a3a3a3] uppercase">Days</div>
              </div>
              <div className="text-[#a3a3a3]">:</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#cb6b1e] font-mono">{String(countdown.hours).padStart(2, '0')}</div>
                <div className="text-xs text-[#a3a3a3] uppercase">Hrs</div>
              </div>
              <div className="text-[#a3a3a3]">:</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#cb6b1e] font-mono">{String(countdown.minutes).padStart(2, '0')}</div>
                <div className="text-xs text-[#a3a3a3] uppercase">Min</div>
              </div>
              <div className="text-[#a3a3a3]">:</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#cb6b1e] font-mono">{String(countdown.seconds).padStart(2, '0')}</div>
                <div className="text-xs text-[#a3a3a3] uppercase">Sec</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin & Logout Controls */}
      {!editMode && (
        <div className="fixed bottom-6 right-6 z-50 flex gap-2">
          <button
            onClick={() => {
              setAuthenticated(false);
              localStorage.removeItem("pitch-deck-authenticated");
              setPin("");
            }}
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 text-[#a3a3a3] px-6 py-3 rounded-xl text-sm hover:bg-white/15 transition-all shadow-lg hover:shadow-xl"
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 10px 30px rgba(0, 0, 0, 0.3)'
            }}
          >
            Logout
          </button>
          <button
            onClick={() => setShowAdminAuth(true)}
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 text-[#a3a3a3] px-6 py-3 rounded-xl text-sm hover:bg-white/15 transition-all shadow-lg hover:shadow-xl"
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 10px 30px rgba(0, 0, 0, 0.3)'
            }}
          >
            Admin
          </button>
        </div>
      )}

      {editMode && (
        <div className="fixed bottom-6 right-6 z-50 flex gap-2">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 text-[#a3a3a3] px-6 py-3 rounded-xl text-sm hover:bg-white/15 transition-all shadow-lg"
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 10px 30px rgba(0, 0, 0, 0.3)'
            }}
          >
            {previewMode ? "Back to Edit" : "Preview"}
          </button>
          <button
            onClick={() => {
              setEditMode(false);
              setPreviewMode(false);
            }}
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 text-[#a3a3a3] px-6 py-3 rounded-xl text-sm hover:bg-white/15 transition-all shadow-lg"
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 10px 30px rgba(0, 0, 0, 0.3)'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="bg-gradient-to-br from-[#cb6b1e] to-[#e37a2e] hover:from-[#e37a2e] hover:to-[#cb6b1e] text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg disabled:opacity-50"
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 10px 30px rgba(0, 0, 0, 0.3)'
            }}
          >
            {saveStatus === "saving" ? "Saving..." : saveStatus === "success" ? "Saved!" : "Save Changes"}
          </button>
        </div>
      )}

      {/* Admin Auth Modal */}
      {showAdminAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-[#f6e1bd] mb-4">Admin Access</h2>
            <form onSubmit={handleAdminAuth} className="space-y-4">
              <input
                type="password"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-[#f6e1bd] focus:outline-none focus:border-[#cb6b1e]"
                placeholder="Admin PIN"
                maxLength={4}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminAuth(false);
                    setAdminPin("");
                  }}
                  className="flex-1 bg-white/5 text-[#a3a3a3] px-4 py-3 rounded-lg hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#cb6b1e] hover:bg-[#e37a2e] text-white px-4 py-3 rounded-lg font-semibold"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* Display Mode Toggle */}
        {!editMode && (
          <div className="mb-8 flex justify-center">
            <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-lg p-1 inline-flex">
              <button
                onClick={() => setContent({ ...content, displayMode: "vertical" })}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  currentDisplayMode === "vertical"
                    ? "bg-[#cb6b1e] text-white"
                    : "text-[#a3a3a3] hover:text-[#f6e1bd]"
                }`}
              >
                Scroll View
              </button>
              <button
                onClick={() => setContent({ ...content, displayMode: "carousel" })}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  currentDisplayMode === "carousel"
                    ? "bg-[#cb6b1e] text-white"
                    : "text-[#a3a3a3] hover:text-[#f6e1bd]"
                }`}
              >
                Slideshow
              </button>
            </div>
          </div>
        )}

        {/* Edit Mode Controls */}
        {editMode && !previewMode && (
          <div className="mb-8 bg-white/5 backdrop-blur-xl border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#f6e1bd] mb-4">Add Content</h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleAddSlide("text")}
                className="px-4 py-2 bg-[#cb6b1e] hover:bg-[#e37a2e] text-white rounded-lg text-sm"
              >
                + Text Slide
              </button>
              <button
                onClick={() => handleAddSlide("pdf")}
                className="px-4 py-2 bg-[#cb6b1e] hover:bg-[#e37a2e] text-white rounded-lg text-sm"
              >
                + PDF Slide
              </button>
              <button
                onClick={() => handleAddSlide("video")}
                className="px-4 py-2 bg-[#cb6b1e] hover:bg-[#e37a2e] text-white rounded-lg text-sm"
              >
                + Video
              </button>
            </div>

            {/* Mode selector in edit mode */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <label className="block text-sm text-[#a3a3a3] mb-2">Display Mode</label>
              <select
                value={formState?.displayMode || "vertical"}
                onChange={(e) =>
                  setFormState({
                    ...formState!,
                    displayMode: e.target.value as "vertical" | "carousel",
                  })
                }
                className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-[#f6e1bd] focus:outline-none focus:border-[#cb6b1e]"
              >
                <option value="vertical">Vertical Scroll</option>
                <option value="carousel">Carousel/Slideshow</option>
              </select>
            </div>
          </div>
        )}

        {/* Slides Display (Vertical Scroll Mode) */}
        {currentDisplayMode === "vertical" && (
          <div className="space-y-8">
            {displaySlides.map((slide) => (
              <div
                key={slide.id}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-10"
                style={{
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 20px 60px rgba(0, 0, 0, 0.4)'
                }}
              >
                {editMode && !previewMode && (
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMoveSlide(slide.id, "up")}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-[#a3a3a3]"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveSlide(slide.id, "down")}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-[#a3a3a3]"
                      >
                        ↓
                      </button>
                    </div>
                    <button
                      onClick={() => handleDeleteSlide(slide.id)}
                      className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm"
                    >
                      Delete
                    </button>
                  </div>
                )}

                {slide.type === "text" && (
                  <div>
                    {editMode && !previewMode ? (
                      <div className="space-y-2">
                        <textarea
                          value={slide.textContent || ""}
                          onChange={(e) =>
                            handleUpdateSlide(slide.id, { textContent: e.target.value })
                          }
                          className="w-full h-48 px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-[#f6e1bd] focus:outline-none focus:border-[#cb6b1e] font-mono text-sm"
                          placeholder="Slide content (markdown supported: # headers, **bold**, *italic*)"
                        />
                        <FormattingHelper compact />
                      </div>
                    ) : (
                      <div className="prose prose-invert max-w-none">
                        <div
                          className="text-[#f6e1bd] leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: formatPitchDeckText(slide.textContent || ""),
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {slide.type === "pdf" && (
                  <div>
                    {editMode && !previewMode ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={slide.pdfUrl || ""}
                            onChange={(e) => handleUpdateSlide(slide.id, { pdfUrl: e.target.value })}
                            className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-[#f6e1bd] focus:outline-none focus:border-[#cb6b1e] text-sm"
                            placeholder="Google Slides: File → Publish to web → Embed (presentation mode, view-only)"
                          />
                          <label className="px-4 py-2 bg-[#cb6b1e] hover:bg-[#e37a2e] text-white rounded-lg cursor-pointer text-sm font-medium transition-colors whitespace-nowrap">
                            {uploadingFiles[slide.id] ? "Uploading..." : "Upload PDF"}
                            <input
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              disabled={uploadingFiles[slide.id]}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(slide.id, file, "pdf");
                              }}
                            />
                          </label>
                        </div>
                        <input
                          type="text"
                          value={slide.pdfFileName || ""}
                          onChange={(e) =>
                            handleUpdateSlide(slide.id, { pdfFileName: e.target.value })
                          }
                          className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-[#f6e1bd] focus:outline-none focus:border-[#cb6b1e] text-sm"
                          placeholder="File name (optional)"
                        />
                      </div>
                    ) : slide.pdfUrl ? (
                      <div className="aspect-[16/9] bg-white/5 rounded-lg flex items-center justify-center">
                        <iframe
                          src={slide.pdfUrl}
                          className="w-full h-full rounded-lg"
                          title={slide.pdfFileName || "PDF"}
                        />
                      </div>
                    ) : (
                      <div className="text-[#a3a3a3] text-center py-8">No PDF uploaded</div>
                    )}
                  </div>
                )}

                {slide.type === "video" && (
                  <div>
                    {editMode && !previewMode ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={slide.videoUrl || ""}
                            onChange={(e) =>
                              handleUpdateSlide(slide.id, { videoUrl: e.target.value })
                            }
                            className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-[#f6e1bd] focus:outline-none focus:border-[#cb6b1e] text-sm"
                            placeholder="Video URL (auto-filled after upload)"
                            readOnly
                          />
                          <label className="px-4 py-2 bg-[#cb6b1e] hover:bg-[#e37a2e] text-white rounded-lg cursor-pointer text-sm font-medium transition-colors whitespace-nowrap">
                            {uploadingFiles[slide.id] ? "Uploading..." : "Upload Video"}
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              disabled={uploadingFiles[slide.id]}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(slide.id, file, "video");
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ) : slide.videoUrl ? (
                      <div className="aspect-video bg-white/5 rounded-lg overflow-hidden">
                        <video src={slide.videoUrl} controls className="w-full h-full" />
                      </div>
                    ) : (
                      <div className="text-[#a3a3a3] text-center py-8">No video added</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Carousel Mode */}
        {currentDisplayMode === "carousel" && displaySlides.length > 0 && (
          <div className="relative">
            {/* Current Slide Display */}
            <div
              className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-10 min-h-[500px]"
              style={{
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 20px 60px rgba(0, 0, 0, 0.4)'
              }}
            >
              {editMode && !previewMode && (
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleMoveSlide(displaySlides[currentSlideIndex].id, "up")
                      }
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-[#a3a3a3]"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() =>
                        handleMoveSlide(displaySlides[currentSlideIndex].id, "down")
                      }
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-[#a3a3a3]"
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    onClick={() => handleDeleteSlide(displaySlides[currentSlideIndex].id)}
                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm"
                  >
                    Delete
                  </button>
                </div>
              )}

              {/* Render Current Slide */}
              {(() => {
                const slide = displaySlides[currentSlideIndex];

                return (
                  <>
                    {slide.type === "text" && (
                      <div>
                        {editMode && !previewMode ? (
                          <div className="space-y-2">
                            <textarea
                              value={slide.textContent || ""}
                              onChange={(e) =>
                                handleUpdateSlide(slide.id, { textContent: e.target.value })
                              }
                              className="w-full h-96 px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-[#f6e1bd] focus:outline-none focus:border-[#cb6b1e] font-mono text-sm"
                              placeholder="Slide content (markdown supported: # headers, **bold**, *italic*)"
                            />
                            <FormattingHelper compact />
                          </div>
                        ) : (
                          <div className="prose prose-invert max-w-none text-lg">
                            <div
                              className="text-[#f6e1bd] leading-relaxed"
                              dangerouslySetInnerHTML={{
                                __html: formatPitchDeckText(slide.textContent || ""),
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {slide.type === "pdf" && (
                      <div>
                        {editMode && !previewMode ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={slide.pdfUrl || ""}
                                onChange={(e) =>
                                  handleUpdateSlide(slide.id, { pdfUrl: e.target.value })
                                }
                                className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-[#f6e1bd] focus:outline-none focus:border-[#cb6b1e] text-sm"
                                placeholder="Google Slides: File → Publish to web → Embed (presentation mode, view-only)"
                              />
                              <label className="px-4 py-2 bg-[#cb6b1e] hover:bg-[#e37a2e] text-white rounded-lg cursor-pointer text-sm font-medium transition-colors whitespace-nowrap">
                                {uploadingFiles[slide.id] ? "Uploading..." : "Upload PDF"}
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  className="hidden"
                                  disabled={uploadingFiles[slide.id]}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileUpload(slide.id, file, "pdf");
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        ) : slide.pdfUrl ? (
                          <div className="aspect-[16/9] bg-white/5 rounded-lg">
                            <iframe
                              src={slide.pdfUrl}
                              className="w-full h-full rounded-lg"
                              title="PDF"
                            />
                          </div>
                        ) : (
                          <div className="text-[#a3a3a3] text-center py-16">No PDF</div>
                        )}
                      </div>
                    )}

                    {slide.type === "video" && (
                      <div>
                        {editMode && !previewMode ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={slide.videoUrl || ""}
                                onChange={(e) =>
                                  handleUpdateSlide(slide.id, { videoUrl: e.target.value })
                                }
                                className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-[#f6e1bd] focus:outline-none focus:border-[#cb6b1e] text-sm"
                                placeholder="Video URL (auto-filled after upload)"
                                readOnly
                              />
                              <label className="px-4 py-2 bg-[#cb6b1e] hover:bg-[#e37a2e] text-white rounded-lg cursor-pointer text-sm font-medium transition-colors whitespace-nowrap">
                                {uploadingFiles[slide.id] ? "Uploading..." : "Upload Video"}
                                <input
                                  type="file"
                                  accept="video/*"
                                  className="hidden"
                                  disabled={uploadingFiles[slide.id]}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileUpload(slide.id, file, "video");
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        ) : slide.videoUrl ? (
                          <div className="aspect-video bg-white/5 rounded-lg overflow-hidden">
                            <video src={slide.videoUrl} controls className="w-full h-full" />
                          </div>
                        ) : (
                          <div className="text-[#a3a3a3] text-center py-16">No video</div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Carousel Navigation */}
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={() =>
                  setCurrentSlideIndex((prev) =>
                    prev > 0 ? prev - 1 : displaySlides.length - 1
                  )
                }
                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-lg text-[#f6e1bd] transition-colors"
                disabled={displaySlides.length <= 1}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <div className="text-[#f6e1bd] font-mono">
                {currentSlideIndex + 1} / {displaySlides.length}
              </div>

              <button
                onClick={() =>
                  setCurrentSlideIndex((prev) =>
                    prev < displaySlides.length - 1 ? prev + 1 : 0
                  )
                }
                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-lg text-[#f6e1bd] transition-colors"
                disabled={displaySlides.length <= 1}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* Slide Indicators */}
            <div className="mt-4 flex justify-center gap-2">
              {displaySlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentSlideIndex
                      ? "w-8 bg-[#cb6b1e]"
                      : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
