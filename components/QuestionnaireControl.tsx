"use client";

import React, { useRef, useState } from "react";
import type { QuestionnaireAnswers } from "../lib/questionnaire";

type QuestionnaireControlProps = {
  template: QuestionnaireAnswers;
  onApply: (answers: QuestionnaireAnswers) => void;
};

const QuestionnaireControl: React.FC<QuestionnaireControlProps> = ({
  template,
  onApply,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState(
    "Paste JSON that matches the questionnaire answers and click apply."
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const setStatusHelper = (
    mode: "idle" | "success" | "error",
    message: string
  ) => {
    setStatus(mode);
    setStatusMessage(message);
  };

  const applyFromText = (raw: string) => {
    const parsed = JSON.parse(raw) as QuestionnaireAnswers;
    onApply(parsed);
    setStatusHelper(
      "success",
      `Update applied at ${new Date().toLocaleTimeString()}`
    );
  };

  const handleApply = () => {
    if (!inputValue.trim()) {
      setStatusHelper("error", "Paste questionnaire JSON before applying.");
      return;
    }
    try {
      applyFromText(inputValue);
    } catch (error) {
      setStatusHelper(
        "error",
        `Could not parse JSON: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleLoadTemplate = () => {
    setInputValue(JSON.stringify(template, null, 2));
    setStatusHelper(
      "idle",
      "Template loaded. Edit fields then click Apply JSON to preview."
    );
  };

  const handleReset = () => {
    try {
      onApply(template);
      setInputValue("");
      setStatusHelper(
        "success",
        "Reverted to the default Baseline questionnaire data."
      );
    } catch (error) {
      setStatusHelper(
        "error",
        `Reset failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleCopyTemplate = async () => {
    const templateString = JSON.stringify(template, null, 2);
    try {
      await navigator.clipboard.writeText(templateString);
      setStatusHelper("success", "Template copied to clipboard.");
    } catch {
      setStatusHelper(
        "error",
        "Clipboard blocked. Use the Load Template button instead."
      );
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      setInputValue(text);
      applyFromText(text);
    } catch (error) {
      setStatusHelper(
        "error",
        `Import failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      event.target.value = "";
    }
  };

  const helperClass =
    status === "success"
      ? "text-[#22c55e]"
      : status === "error"
      ? "text-[#f87171]"
      : "text-[#a3a3a3]";

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-[#2e2e2e] bg-[#0b0b0b] p-4">
      <div className="flex flex-col gap-2 text-sm text-[#d4d4d4] sm:flex-row sm:items-center sm:justify-between">
        <p>Paste JSON answers or upload a .json export to refresh this page.</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={handleLoadTemplate}
            className="rounded-lg border border-[#262626] px-3 py-1 hover:border-[#cb6b1e] hover:text-[#cb6b1e]"
          >
            Load template
          </button>
          <button
            onClick={handleCopyTemplate}
            className="rounded-lg border border-[#262626] px-3 py-1 hover:border-[#cb6b1e] hover:text-[#cb6b1e]"
          >
            Copy template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-[#262626] px-3 py-1 hover:border-[#cb6b1e] hover:text-[#cb6b1e]"
          >
            Upload .json
          </button>
        </div>
      </div>

      <textarea
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        placeholder='{"hero": { ... }}'
        className="h-48 w-full rounded-xl border border-[#1f1f1f] bg-[#070707] p-3 text-xs text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
        spellCheck={false}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleApply}
          className="rounded-lg bg-[#cb6b1e] px-4 py-2 text-xs font-semibold text-black hover:bg-[#e37a2e]"
        >
          Apply JSON
        </button>
        <button
          onClick={handleReset}
          className="rounded-lg border border-[#262626] px-3 py-2 text-xs text-[#a3a3a3] hover:text-[#f6e1bd]"
        >
          Reset to default
        </button>
        <p className={`text-[11px] ${helperClass}`}>{statusMessage}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
};

export default QuestionnaireControl;
