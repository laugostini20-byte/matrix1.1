import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { calculateCoverageStats } from "../business-logic/coverage-stats";

// ─────────────────────────────────────────────────────────────────────────────
// App State Context - Global application state
// ─────────────────────────────────────────────────────────────────────────────

type PageType = "search" | "details" | "upload";

type CoverageStats = ReturnType<typeof calculateCoverageStats>;

interface AppStateContextType {
  // Navigation
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
  
  // Dark mode
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Coverage statistics
  coverageStats: CoverageStats | null;
  setCoverageStats: (stats: CoverageStats | null) => void;
  
  // Diagnostics
  showDiag: boolean;
  setShowDiag: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  // Navigation state
  const [currentPage, setCurrentPage] = useState<PageType>("search");
  
  // Dark mode (persisted to localStorage)
  const [darkMode, setDarkMode] = useLocalStorage<boolean>("darkMode", false);
  
  // Coverage statistics
  const [coverageStats, setCoverageStats] = useState<CoverageStats | null>(null);
  
  // Diagnostics
  const [showDiag, setShowDiag] = useState<boolean>(false);
  
  // Calculate coverage stats on mount
  useEffect(() => {
    const stats = calculateCoverageStats();
    setCoverageStats(stats);
    console.log("📊 Standards Coverage Analysis:", stats);
  }, []);
  
  // Dark mode effect - apply classes to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, [darkMode]);
  
  const value: AppStateContextType = {
    currentPage,
    setCurrentPage,
    darkMode,
    setDarkMode,
    coverageStats,
    setCoverageStats,
    showDiag,
    setShowDiag,
  };
  
  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

/**
 * Hook to access app state context
 * Must be used within AppStateProvider
 */
export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return context;
}

