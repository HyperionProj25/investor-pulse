"use client";

import { useState, useEffect, useCallback } from "react";
import type { PhaseId } from "@/lib/year1Plan";

const STORAGE_KEY = "baseline-year1-plan";

interface Year1PlanState {
  checkedItems: Record<string, boolean>;
  collapsedSections: Record<string, boolean>;
  lastUpdated: string;
}

const defaultState: Year1PlanState = {
  checkedItems: {},
  collapsedSections: {},
  lastUpdated: new Date().toISOString(),
};

export function useYear1PlanStorage() {
  const [state, setState] = useState<Year1PlanState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Year1PlanState;
        setState(parsed);
      }
    } catch (error) {
      console.error("Failed to load Year 1 Plan state:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error("Failed to save Year 1 Plan state:", error);
      }
    }
  }, [state, isLoaded]);

  // Toggle a checkbox
  const toggleCheckbox = useCallback((itemId: string) => {
    setState((prev) => ({
      ...prev,
      checkedItems: {
        ...prev.checkedItems,
        [itemId]: !prev.checkedItems[itemId],
      },
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  // Toggle section collapsed state
  const toggleSection = useCallback((sectionId: string) => {
    setState((prev) => ({
      ...prev,
      collapsedSections: {
        ...prev.collapsedSections,
        [sectionId]: !prev.collapsedSections[sectionId],
      },
    }));
  }, []);

  // Check if an item is checked
  const isChecked = useCallback(
    (itemId: string) => {
      return state.checkedItems[itemId] ?? false;
    },
    [state.checkedItems]
  );

  // Check if a section is collapsed
  const isCollapsed = useCallback(
    (sectionId: string) => {
      return state.collapsedSections[sectionId] ?? false;
    },
    [state.collapsedSections]
  );

  // Get progress for a specific phase
  const getPhaseProgress = useCallback(
    (phaseId: PhaseId, allItemIds: string[]) => {
      const phaseItems = allItemIds.filter((id) => id.startsWith(`p${phaseId === "pre-launch" ? "1" : phaseId === "launch" ? "2" : phaseId === "growth" ? "3" : "4"}-`));
      const checkedCount = phaseItems.filter((id) => state.checkedItems[id]).length;
      return {
        completed: checkedCount,
        total: phaseItems.length,
        percentage: phaseItems.length > 0 ? Math.round((checkedCount / phaseItems.length) * 100) : 0,
      };
    },
    [state.checkedItems]
  );

  // Get overall progress
  const getOverallProgress = useCallback(
    (allItemIds: string[]) => {
      const checkedCount = allItemIds.filter((id) => state.checkedItems[id]).length;
      return {
        completed: checkedCount,
        total: allItemIds.length,
        percentage: allItemIds.length > 0 ? Math.round((checkedCount / allItemIds.length) * 100) : 0,
      };
    },
    [state.checkedItems]
  );

  // Export state as JSON
  const exportState = useCallback(() => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `baseline-year1-plan-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [state]);

  // Reset all progress
  const resetProgress = useCallback(() => {
    setState({
      ...defaultState,
      lastUpdated: new Date().toISOString(),
    });
  }, []);

  // Expand all sections
  const expandAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      collapsedSections: {},
    }));
  }, []);

  // Collapse all sections
  const collapseAll = useCallback((sectionIds: string[]) => {
    const collapsed: Record<string, boolean> = {};
    sectionIds.forEach((id) => {
      collapsed[id] = true;
    });
    setState((prev) => ({
      ...prev,
      collapsedSections: collapsed,
    }));
  }, []);

  return {
    isLoaded,
    checkedItems: state.checkedItems,
    lastUpdated: state.lastUpdated,
    toggleCheckbox,
    toggleSection,
    isChecked,
    isCollapsed,
    getPhaseProgress,
    getOverallProgress,
    exportState,
    resetProgress,
    expandAll,
    collapseAll,
  };
}
