import React, { useState, useEffect, useRef } from "react";
import { SERVICE_LEVEL_DESC, ALL_LEVELS } from "../top-level";

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Select Service Level Component
// ─────────────────────────────────────────────────────────────────────────────

export function ServiceLevelSelector({
  rowIndex,
  selectedLevels,
  onUpdateServiceLevel,
  onUpdateServiceLevels,
  onToggleServiceLevel,
  onToggleMultiSelectMode,
  isMultiSelect,
  darkMode,
}: {
  rowIndex: number;
  selectedLevels: Set<number>;
  onUpdateServiceLevel: (rowIndex: number, level: number) => void;
  onUpdateServiceLevels: (rowIndex: number, levels: Set<number>) => void;
  onToggleServiceLevel: (rowIndex: number, level: number) => void;
  onToggleMultiSelectMode: (rowIndex: number) => void;
  isMultiSelect: boolean;
  darkMode: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSingleSelect = (level: number) => {
    onUpdateServiceLevel(rowIndex, level);
    setIsOpen(false);
  };

  const handleMultiSelectToggle = (level: number) => {
    onToggleServiceLevel(rowIndex, level);
  };

  const getDisplayText = () => {
    if (selectedLevels.size === 0) {
      return "Select level...";
    }
    if (selectedLevels.size === 1) {
      const level = Array.from(selectedLevels)[0];
      return `L${level}`;
    }
    return `${selectedLevels.size} levels`;
  };

  const getSelectedBadges = () => {
    if (selectedLevels.size <= 1) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {Array.from(selectedLevels)
          .sort((a, b) => a - b)
          .map((level) => (
            <span
              key={level}
              className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium"
            >
              L{level}
            </span>
          ))}
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex gap-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
            darkMode
              ? "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              : "bg-white border-gray-300 hover:bg-gray-50"
          }`}
        >
          {getDisplayText()}
        </button>
        <button
          onClick={() => onToggleMultiSelectMode(rowIndex)}
          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
            isMultiSelect
              ? darkMode
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-blue-500 border-blue-400 text-white"
              : darkMode
              ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
              : "bg-white border-gray-300 hover:bg-gray-50"
          }`}
          title={isMultiSelect ? "Switch to single select" : "Enable multi-select"}
        >
          {isMultiSelect ? "✓" : "☰"}
        </button>
      </div>
      {getSelectedBadges()}

      {isOpen && (
        <div
          className={`absolute z-50 mt-1 w-full rounded-lg border shadow-lg max-h-64 overflow-y-auto ${
            darkMode
              ? "bg-gray-800 border-gray-600"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="p-2">
            {ALL_LEVELS.map((level) => {
              const isSelected = selectedLevels.has(level);
              return (
                <button
                  key={level}
                  onClick={() =>
                    isMultiSelect
                      ? handleMultiSelectToggle(level)
                      : handleSingleSelect(level)
                  }
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    isSelected
                      ? darkMode
                        ? "bg-blue-600 text-white"
                        : "bg-blue-500 text-white"
                      : darkMode
                      ? "hover:bg-gray-700 text-gray-200"
                      : "hover:bg-gray-100 text-gray-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Level {level}</span>
                    {isMultiSelect && isSelected && <span>✓</span>}
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      isSelected
                        ? "text-white/80"
                        : darkMode
                        ? "text-gray-400"
                        : "text-gray-500"
                    }`}
                  >
                    {SERVICE_LEVEL_DESC[level]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

