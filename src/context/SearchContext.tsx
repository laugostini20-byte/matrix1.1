import { createContext, useContext, useState, ReactNode } from "react";
import type { Unit } from "../top-level";

// ─────────────────────────────────────────────────────────────────────────────
// Search Context - Search page state and filters
// ─────────────────────────────────────────────────────────────────────────────

interface SearchContextType {
  // Basic search filters
  partQ: string;
  setPartQ: (q: string) => void;
  mfrQ: string;
  setMfrQ: (q: string) => void;
  modelQ: string;
  setModelQ: (q: string) => void;
  descQ: string;
  setDescQ: (q: string) => void;
  
  // Advanced filters
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (show: boolean) => void;
  priceMin: string;
  setPriceMin: (price: string) => void;
  priceMax: string;
  setPriceMax: (price: string) => void;
  hasOnsiteFilter: string;
  setHasOnsiteFilter: (filter: string) => void;
  
  // Comparison mode
  compareMode: boolean;
  setCompareMode: (mode: boolean) => void;
  selectedForCompare: Set<string>;
  setSelectedForCompare: (selected: Set<string>) => void;
  showCompareModal: boolean;
  setShowCompareModal: (show: boolean) => void;
  
  // Selected unit for detail view
  selected: Unit | null;
  setSelected: (unit: Unit | null) => void;
  
  // Detail view filters
  capType: string;
  setCapType: (type: string) => void;
  accred: string;
  setAccred: (accred: string) => void;
  svclevel: Set<number>;
  setSvclevel: (levels: Set<number>) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  // Basic search filters
  const [partQ, setPartQ] = useState("");
  const [mfrQ, setMfrQ] = useState("");
  const [modelQ, setModelQ] = useState("");
  const [descQ, setDescQ] = useState("");
  
  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [hasOnsiteFilter, setHasOnsiteFilter] = useState<string>("all");
  
  // Comparison mode
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(
    new Set()
  );
  const [showCompareModal, setShowCompareModal] = useState(false);
  
  // Selected unit for detail view (Page B)
  const [selected, setSelected] = useState<Unit | null>(null);
  
  // Detail view filters (used inside DetailView)
  const [capType, setCapType] = useState<string>("All");
  const [accred, setAccred] = useState<string>("All");
  const [svclevel, setSvclevel] = useState<Set<number>>(new Set());
  
  const value: SearchContextType = {
    partQ,
    setPartQ,
    mfrQ,
    setMfrQ,
    modelQ,
    setModelQ,
    descQ,
    setDescQ,
    showAdvancedFilters,
    setShowAdvancedFilters,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    hasOnsiteFilter,
    setHasOnsiteFilter,
    compareMode,
    setCompareMode,
    selectedForCompare,
    setSelectedForCompare,
    showCompareModal,
    setShowCompareModal,
    selected,
    setSelected,
    capType,
    setCapType,
    accred,
    setAccred,
    svclevel,
    setSvclevel,
  };
  
  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

/**
 * Hook to access search context
 * Must be used within SearchProvider
 */
export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within SearchProvider");
  }
  return context;
}

