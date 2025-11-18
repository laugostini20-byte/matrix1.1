import React, { createContext, useContext, useState, ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";

// ─────────────────────────────────────────────────────────────────────────────
// Lab Selection Context - Lab/pricing selections and preferences
// ─────────────────────────────────────────────────────────────────────────────

interface LabSelectionContextType {
  // Service level selections
  selectedServiceLevels: Map<number, number>;
  setSelectedServiceLevels: (levels: Map<number, number>) => void;
  selectedServiceLevelSets: Map<number, Set<number>>;
  setSelectedServiceLevelSets: (sets: Map<number, Set<number>>) => void;
  multiSelectMode: Map<number, boolean>;
  setMultiSelectMode: (mode: Map<number, boolean>) => void;
  
  // Lab and pricing selections
  selectedPrices: Map<number, number>;
  setSelectedPrices: (prices: Map<number, number>) => void;
  selectedLabs: Map<number, string>;
  setSelectedLabs: (labs: Map<number, string>) => void;
  
  // Lab preferences (persisted)
  preferredLabFilter: string;
  setPreferredLabFilter: (lab: string) => void;
  zipCodeFilter: string;
  setZipCodeFilter: (zip: string) => void;
  
  // Lab tracking and highlighting
  preferredLab: string;
  setPreferredLab: (lab: string) => void;
  transferLabs: Set<number>;
  setTransferLabs: (labs: Set<number>) => void;
  
  // TMS (Third-Party Vendor Service) state
  tmsLabs: Set<number>;
  setTmsLabs: (labs: Set<number>) => void;
  tmsVendors: Map<number, string>;
  setTmsVendors: (vendors: Map<number, string>) => void;
  tmsPrices: Map<number, number>;
  setTmsPrices: (prices: Map<number, number>) => void;
  tmsTurnTimes: Map<number, number>;
  setTmsTurnTimes: (times: Map<number, number>) => void;
  
  // Lab capability overrides
  labCapabilityOverrides: Map<string, Set<string>>;
  setLabCapabilityOverrides: (overrides: Map<string, Set<string>>) => void;
  
  // Modal state for lab capability management
  capabilityModalOpen: boolean;
  setCapabilityModalOpen: (open: boolean) => void;
  capabilityModalData: {
    rowIndex: number;
    partNumber: string;
    requiredCapabilityTags: any[];
  } | null;
  setCapabilityModalData: (data: {
    rowIndex: number;
    partNumber: string;
    requiredCapabilityTags: any[];
  } | null) => void;
}

const LabSelectionContext = createContext<LabSelectionContextType | undefined>(undefined);

export function LabSelectionProvider({ children }: { children: ReactNode }) {
  // Service level selections
  const [selectedServiceLevels, setSelectedServiceLevels] = useState<
    Map<number, number>
  >(new Map());
  
  // Multi-select service level support
  const [selectedServiceLevelSets, setSelectedServiceLevelSets] = useState<
    Map<number, Set<number>>
  >(new Map());
  
  const [multiSelectMode, setMultiSelectMode] = useState<Map<number, boolean>>(
    new Map()
  );
  
  // Lab and pricing selections
  const [selectedPrices, setSelectedPrices] = useState<Map<number, number>>(
    new Map()
  );
  
  const [selectedLabs, setSelectedLabs] = useState<Map<number, string>>(
    new Map()
  );
  
  // Lab preferences (persisted to localStorage)
  const [preferredLabFilter, setPreferredLabFilter] = useLocalStorage<string>("preferredLab", "");
  const [zipCodeFilter, setZipCodeFilter] = useLocalStorage<string>("zipCode", "");
  
  // Track preferred lab and transfer labs for highlighting
  const [preferredLab, setPreferredLab] = useState<string>("");
  const [transferLabs, setTransferLabs] = useState<Set<number>>(new Set());
  
  // TMS (Third-Party Vendor Service) state
  const [tmsLabs, setTmsLabs] = useState<Set<number>>(new Set());
  const [tmsVendors, setTmsVendors] = useState<Map<number, string>>(new Map());
  const [tmsPrices, setTmsPrices] = useState<Map<number, number>>(new Map());
  const [tmsTurnTimes, setTmsTurnTimes] = useState<Map<number, number>>(
    new Map()
  );
  
  // Track lab capability overrides (labCode -> Set of partNumbers)
  const [labCapabilityOverrides, setLabCapabilityOverrides] = useState<
    Map<string, Set<string>>
  >(new Map());
  
  // Modal state for lab capability management
  const [capabilityModalOpen, setCapabilityModalOpen] = useState(false);
  const [capabilityModalData, setCapabilityModalData] = useState<{
    rowIndex: number;
    partNumber: string;
    requiredCapabilityTags: any[];
  } | null>(null);
  
  const value: LabSelectionContextType = {
    selectedServiceLevels,
    setSelectedServiceLevels,
    selectedServiceLevelSets,
    setSelectedServiceLevelSets,
    multiSelectMode,
    setMultiSelectMode,
    selectedPrices,
    setSelectedPrices,
    selectedLabs,
    setSelectedLabs,
    preferredLabFilter,
    setPreferredLabFilter,
    zipCodeFilter,
    setZipCodeFilter,
    preferredLab,
    setPreferredLab,
    transferLabs,
    setTransferLabs,
    tmsLabs,
    setTmsLabs,
    tmsVendors,
    setTmsVendors,
    tmsPrices,
    setTmsPrices,
    tmsTurnTimes,
    setTmsTurnTimes,
    labCapabilityOverrides,
    setLabCapabilityOverrides,
    capabilityModalOpen,
    setCapabilityModalOpen,
    capabilityModalData,
    setCapabilityModalData,
  };
  
  return (
    <LabSelectionContext.Provider value={value}>
      {children}
    </LabSelectionContext.Provider>
  );
}

/**
 * Hook to access lab selection context
 * Must be used within LabSelectionProvider
 */
export function useLabSelection() {
  const context = useContext(LabSelectionContext);
  if (context === undefined) {
    throw new Error("useLabSelection must be used within LabSelectionProvider");
  }
  return context;
}

