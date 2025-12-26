"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import BizDevNav from "@/components/BizDevNav";
import { ADMIN_PERSONAS, ADMIN_SLUGS } from "@/lib/adminUsers";
import { BOSPayload, DEFAULT_BOS_PAYLOAD, SystemMap } from "@/lib/bos";

// Diagram templates
const DIAGRAM_TEMPLATES = {
  flywheel: `graph LR
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

  valueChain: `graph TD
    V[Vision] --> D[Data Asset]
    D --> P[Product]
    P --> R[Revenue]
    R --> M[Moat]
    M --> V

    style V fill:#cb6b1e,stroke:#f6e1bd,color:#000
    style D fill:#3b82f6,stroke:#f6e1bd,color:#fff
    style P fill:#22c55e,stroke:#f6e1bd,color:#000
    style R fill:#eab308,stroke:#f6e1bd,color:#000
    style M fill:#a855f7,stroke:#f6e1bd,color:#fff`,

  simple: `graph LR
    A[Input] --> B[Process]
    B --> C[Output]
    C --> D[Feedback]
    D --> A

    style B fill:#cb6b1e,stroke:#f6e1bd,color:#000`,
};

export default function SystemMapPage() {
  const router = useRouter();
  const [authorizedAdmin, setAuthorizedAdmin] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bosData, setBosData] = useState<BOSPayload>(DEFAULT_BOS_PAYLOAD);
  const [form, setForm] = useState<SystemMap>(DEFAULT_BOS_PAYLOAD.systemMap);
  const [originalForm, setOriginalForm] = useState<SystemMap>(
    DEFAULT_BOS_PAYLOAD.systemMap
  );
  const [focusMode, setFocusMode] = useState(false);
  const [diagramSvg, setDiagramSvg] = useState<string>("");
  const [diagramError, setDiagramError] = useState<string>("");
  const [showEditor, setShowEditor] = useState(true);
  const [mermaidLoaded, setMermaidLoaded] = useState(false);
  const mermaidRef = useRef<any>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const adminLabel = useMemo(() => {
    if (!authorizedAdmin) return undefined;
    const admin = ADMIN_PERSONAS.find((p) => p.slug === authorizedAdmin);
    return admin?.shortLabel ?? admin?.name ?? authorizedAdmin;
  }, [authorizedAdmin]);

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(originalForm);
  }, [form, originalForm]);

  // Initialize mermaid
  useEffect(() => {
    const loadMermaid = async () => {
      try {
        const mermaid = await import("mermaid");
        mermaid.default.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#cb6b1e",
            primaryTextColor: "#f6e1bd",
            primaryBorderColor: "#cb6b1e",
            lineColor: "#737373",
            secondaryColor: "#1a1a1a",
            tertiaryColor: "#0b0b0b",
            background: "#020202",
            mainBkg: "#0b0b0b",
            nodeBorder: "#cb6b1e",
            clusterBkg: "#1a1a1a",
            titleColor: "#f6e1bd",
            edgeLabelBackground: "#1a1a1a",
          },
          flowchart: {
            htmlLabels: true,
            curve: "basis",
          },
        });
        mermaidRef.current = mermaid.default;
        setMermaidLoaded(true);
      } catch (err) {
        console.error("Failed to load mermaid:", err);
      }
    };
    loadMermaid();
  }, []);

  // Render diagram when code changes
  const renderDiagram = useCallback(async () => {
    if (!mermaidRef.current || !form.mermaidDiagram.trim()) {
      setDiagramSvg("");
      setDiagramError("");
      return;
    }

    try {
      // Clear previous error
      setDiagramError("");

      // Generate unique ID for this render
      const id = `mermaid-${Date.now()}`;

      // Render the diagram
      const { svg } = await mermaidRef.current.render(id, form.mermaidDiagram);
      setDiagramSvg(svg);
    } catch (err: any) {
      console.error("Mermaid render error:", err);
      setDiagramError(err?.message || "Invalid diagram syntax");
      setDiagramSvg("");
    }
  }, [form.mermaidDiagram]);

  // Debounced render
  useEffect(() => {
    if (!mermaidLoaded) return;

    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    renderTimeoutRef.current = setTimeout(() => {
      renderDiagram();
    }, 500);

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [form.mermaidDiagram, mermaidLoaded, renderDiagram]);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        if (!response.ok) {
          router.push("/?mode=admin");
          return;
        }
        const data = await response.json();
        if (data.role === "admin" && ADMIN_SLUGS.includes(data.slug)) {
          setAuthorizedAdmin(data.slug);
        } else {
          router.push("/?mode=admin");
        }
      } catch (err) {
        console.error("Session verification failed:", err);
        router.push("/?mode=admin");
      } finally {
        setSessionChecked(true);
      }
    };
    void verifySession();
  }, [router]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/bos");
        if (response.ok) {
          const data = await response.json();
          if (data?.payload) {
            setBosData(data.payload);
            setForm(data.payload.systemMap);
            setOriginalForm(data.payload.systemMap);
          }
        }
      } catch (err) {
        console.error("Load failed:", err);
      } finally {
        setLoading(false);
      }
    };
    if (authorizedAdmin) void loadData();
  }, [authorizedAdmin]);

  const handleSave = async () => {
    if (!authorizedAdmin) {
      toast.error("Admin access required");
      return;
    }

    setSaving(true);
    try {
      const payload: BOSPayload = {
        ...bosData,
        systemMap: form,
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch("/api/bos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });

      if (!response.ok) {
        throw new Error("Failed to save changes");
      }

      setBosData(payload);
      setOriginalForm(form);
      toast.success("System Map saved!");
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (templateKey: keyof typeof DIAGRAM_TEMPLATES) => {
    setForm((prev) => ({
      ...prev,
      mermaidDiagram: DIAGRAM_TEMPLATES[templateKey],
    }));
  };

  if (!sessionChecked || loading) {
    return (
      <div className="min-h-screen bg-[#020202] text-[#f6e1bd] flex items-center justify-center">
        <p className="text-sm text-[#a3a3a3]">Loading...</p>
      </div>
    );
  }

  if (!authorizedAdmin) {
    return null;
  }

  const inputClass =
    "w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none font-mono";

  // Focus Mode - Full screen diagram presentation
  if (focusMode) {
    return (
      <div className="min-h-screen bg-[#020202] text-[#f6e1bd]">
        {/* Minimal Header */}
        <div className="border-b border-[#1a1a1a] px-6 py-4">
          <div className="mx-auto max-w-6xl flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">System Map</h1>
              <p className="text-sm text-[#737373]">
                Visual leverage and fragility mapping
              </p>
            </div>
            <button
              onClick={() => setFocusMode(false)}
              className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-[#737373] hover:border-[#cb6b1e] hover:text-[#cb6b1e]"
            >
              Exit Focus
            </button>
          </div>
        </div>

        {/* Main Diagram */}
        <main className="mx-auto max-w-6xl px-6 py-8">
          {/* Diagram Display */}
          <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-8 mb-8">
            {diagramSvg ? (
              <div
                className="flex justify-center items-center min-h-[400px] [&_svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: diagramSvg }}
              />
            ) : diagramError ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-red-400">
                <span className="text-3xl mb-4">⚠</span>
                <p className="text-sm">Diagram Error</p>
                <p className="text-xs text-[#737373] mt-2">{diagramError}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-[#737373]">
                <span className="text-3xl mb-4">⬡</span>
                <p className="text-sm">No diagram defined</p>
              </div>
            )}
          </div>

          {/* Leverage & Fragility Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-green-900/30 bg-green-950/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl text-green-400">↑</span>
                <h2 className="text-lg font-semibold text-green-400">
                  Where Leverage Compounds
                </h2>
              </div>
              <p className="text-green-200/80 whitespace-pre-wrap">
                {form.leverageCompounds || "Not defined"}
              </p>
            </div>

            <div className="rounded-2xl border border-red-900/30 bg-red-950/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl text-red-400">⚠</span>
                <h2 className="text-lg font-semibold text-red-400">
                  Where Fragility Exists
                </h2>
              </div>
              <p className="text-red-200/80 whitespace-pre-wrap">
                {form.fragilityExists || "Not defined"}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] text-[#f6e1bd]">
      <BizDevNav adminLabel={adminLabel} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">System Map</h1>
              {hasUnsavedChanges && (
                <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
                  Unsaved
                </span>
              )}
            </div>
            <p className="text-sm text-[#a3a3a3]">
              Visual leverage and fragility mapping
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFocusMode(true)}
              className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-[#737373] hover:border-[#cb6b1e] hover:text-[#cb6b1e]"
            >
              Focus Mode
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className="rounded-lg bg-[#cb6b1e] px-6 py-2 text-sm font-semibold text-black hover:bg-[#e37a2e] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Diagram Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Editor */}
          <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">⬡</span>
                <div>
                  <h2 className="text-lg font-semibold">Diagram Code</h2>
                  <p className="text-xs text-[#737373]">
                    Mermaid flowchart syntax
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditor(!showEditor)}
                className="text-xs text-[#737373] hover:text-[#cb6b1e]"
              >
                {showEditor ? "Collapse" : "Expand"}
              </button>
            </div>

            {/* Templates */}
            <div className="flex gap-2 mb-4">
              <span className="text-xs text-[#737373]">Templates:</span>
              <button
                onClick={() => applyTemplate("flywheel")}
                className="text-xs text-[#cb6b1e] hover:underline"
              >
                Flywheel
              </button>
              <button
                onClick={() => applyTemplate("valueChain")}
                className="text-xs text-[#cb6b1e] hover:underline"
              >
                Value Chain
              </button>
              <button
                onClick={() => applyTemplate("simple")}
                className="text-xs text-[#cb6b1e] hover:underline"
              >
                Simple
              </button>
            </div>

            {showEditor && (
              <textarea
                rows={14}
                className={inputClass}
                value={form.mermaidDiagram}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    mermaidDiagram: e.target.value,
                  }))
                }
                placeholder={`graph LR
    A[Input] --> B[Process]
    B --> C[Output]
    C --> D[Feedback]
    D --> A`}
              />
            )}

            <p className="mt-2 text-xs text-[#3a3a3a]">
              Use{" "}
              <a
                href="https://mermaid.js.org/syntax/flowchart.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#cb6b1e] hover:underline"
              >
                Mermaid flowchart syntax
              </a>
            </p>
          </div>

          {/* Live Preview */}
          <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xl">👁</span>
              <div>
                <h2 className="text-lg font-semibold">Live Preview</h2>
                <p className="text-xs text-[#737373]">
                  {mermaidLoaded ? "Auto-updates as you type" : "Loading..."}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#262626] bg-[#050505] p-4 min-h-[320px] flex items-center justify-center overflow-auto">
              {!mermaidLoaded ? (
                <p className="text-sm text-[#737373]">Loading renderer...</p>
              ) : diagramSvg ? (
                <div
                  className="[&_svg]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: diagramSvg }}
                />
              ) : diagramError ? (
                <div className="text-center">
                  <span className="text-2xl text-red-400 block mb-2">⚠</span>
                  <p className="text-sm text-red-400">Syntax Error</p>
                  <p className="text-xs text-[#737373] mt-2 max-w-xs">
                    {diagramError}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-2xl text-[#3a3a3a] block mb-2">⬡</span>
                  <p className="text-sm text-[#737373]">
                    Enter diagram code to preview
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Leverage & Fragility */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Leverage Compounds */}
          <div className="rounded-2xl border border-green-900/30 bg-green-950/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xl text-green-400">↑</span>
              <div>
                <h2 className="text-lg font-semibold text-green-400">
                  Where Leverage Compounds
                </h2>
                <p className="text-xs text-[#737373]">
                  Flywheel effects. What gets better with scale.
                </p>
              </div>
            </div>
            <textarea
              rows={6}
              className={`${inputClass} border-green-900/30`}
              value={form.leverageCompounds}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  leverageCompounds: e.target.value,
                }))
              }
              placeholder="Data compounds because...
Network effects exist where...
Each customer makes the next easier because..."
            />
            <p className="text-xs text-[#3a3a3a] mt-2 text-right">
              {form.leverageCompounds?.length || 0} characters
            </p>
          </div>

          {/* Fragility Exists */}
          <div className="rounded-2xl border border-red-900/30 bg-red-950/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xl text-red-400">⚠</span>
              <div>
                <h2 className="text-lg font-semibold text-red-400">
                  Where Fragility Exists
                </h2>
                <p className="text-xs text-[#737373]">
                  Single points of failure. Key risks.
                </p>
              </div>
            </div>
            <textarea
              rows={6}
              className={`${inputClass} border-red-900/30`}
              value={form.fragilityExists}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  fragilityExists: e.target.value,
                }))
              }
              placeholder="Single points of failure:
-
Key risks:
-
Dependencies:
-"
            />
            <p className="text-xs text-[#3a3a3a] mt-2 text-right">
              {form.fragilityExists?.length || 0} characters
            </p>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="rounded-xl border border-[#262626] bg-[#050505] p-4">
          <p className="text-xs text-[#737373] uppercase tracking-wider mb-3">
            System Components Quick Reference
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            {[
              { label: "Vision", color: "#cb6b1e", desc: "North Star direction" },
              { label: "Data", color: "#3b82f6", desc: "Unique asset" },
              { label: "Product", color: "#22c55e", desc: "Value delivery" },
              { label: "Revenue", color: "#eab308", desc: "Business model" },
              { label: "Moat", color: "#a855f7", desc: "Defensibility" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-[#262626] p-3 hover:border-opacity-80 transition-colors"
                style={{ borderColor: item.color + "50" }}
              >
                <div
                  className="h-3 w-3 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: item.color }}
                />
                <p className="text-sm font-medium text-[#f6e1bd]">
                  {item.label}
                </p>
                <p className="text-xs text-[#737373] mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mermaid Syntax Help */}
        <div className="mt-6 rounded-xl border border-[#262626] bg-[#050505] p-4">
          <p className="text-xs text-[#737373] uppercase tracking-wider mb-3">
            Quick Syntax Reference
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <p className="text-[#cb6b1e] mb-1">Nodes</p>
              <p className="text-[#a3a3a3]">A[Rectangle]</p>
              <p className="text-[#a3a3a3]">B(Rounded)</p>
              <p className="text-[#a3a3a3]">C{"{"}"Rhombus"{"}"}</p>
            </div>
            <div>
              <p className="text-[#cb6b1e] mb-1">Connections</p>
              <p className="text-[#a3a3a3]">A --{">"} B</p>
              <p className="text-[#a3a3a3]">A --- B</p>
              <p className="text-[#a3a3a3]">A --{">"} |text| B</p>
            </div>
            <div>
              <p className="text-[#cb6b1e] mb-1">Styling</p>
              <p className="text-[#a3a3a3]">style A fill:#cb6b1e</p>
              <p className="text-[#a3a3a3]">style A stroke:#f6e1bd</p>
              <p className="text-[#a3a3a3]">style A color:#000</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
