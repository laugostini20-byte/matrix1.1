import React, { createContext, useContext, useState, ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";

// ─────────────────────────────────────────────────────────────────────────────
// Lab Selection Context - Lab/pricing selections and preferences
// ─────────────────────────────────────────────────────────────────────────────

interface LabSelectionContextType {
  // Service level selections
  selectedServiceLevels: Map<number, number>;
  setSelectedServiceLevels: React.Dispatch<React.SetStateAction<Map<number, number>>>;
  selectedServiceLevelSets: Map<number, Set<number>>;
  setSelectedServiceLevelSets: React.Dispatch<React.SetStateAction<Map<number, Set<number>>>>;
  multiSelectMode: Map<number, boolean>;
  setMultiSelectMode: React.Dispatch<React.SetStateAction<Map<number, boolean>>>;
  
  // Lab and pricing selections
  selectedPrices: Map<number, number>;
  setSelectedPrices: React.Dispatch<React.SetStateAction<Map<number, number>>>;
  selectedLabs: Map<number, string>;
  setSelectedLabs: React.Dispatch<React.SetStateAction<Map<number, string>>>;
  
  // Lab preferences (persisted)
  preferredLabFilter: string;
  setPreferredLabFilter: (lab: string) => void;
  zipCodeFilter: string;
  setZipCodeFilter: (zip: string) => void;
  
  // Lab tracking and highlighting
  preferredLab: string;
  setPreferredLab: (lab: string) => void;
  transferLabs: Set<number>;
  setTransferLabs: React.Dispatch<React.SetStateAction<Set<number>>>;
  
  // TMS (Third-Party Vendor Service) state
  tmsLabs: Set<number>;
  setTmsLabs: React.Dispatch<React.SetStateAction<Set<number>>>;
  tmsVendors: Map<number, string>;
  setTmsVendors: React.Dispatch<React.SetStateAction<Map<number, string>>>;
  tmsPrices: Map<number, number>;
  setTmsPrices: React.Dispatch<React.SetStateAction<Map<number, number>>>;
  tmsTurnTimes: Map<number, number>;
  setTmsTurnTimes: React.Dispatch<React.SetStateAction<Map<number, number>>>;
  
  // Lab capability overrides
  labCapabilityOverrides: Map<string, Set<string>>;
  setLabCapabilityOverrides: React.Dispatch<React.SetStateAction<Map<string, Set<string>>>>;
  
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

