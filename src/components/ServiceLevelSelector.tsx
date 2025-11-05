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
    if (isMultiSelect) {
      if (selectedLevels.size === 0) return "Select levels...";
      if (selectedLevels.size === 1)
        return `Level ${Array.from(selectedLevels)[0]}`;
      return `${selectedLevels.size} levels selected`;
    } else {
      const level = Array.from(selectedLevels)[0] || 1;
      return `Level ${level}`;
    }
  };

  const getSelectedBadges = () => {
    if (!isMultiSelect || selectedLevels.size <= 1) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Array.from(selectedLevels)
          .sort((a, b) => a - b)
          .slice(0, 3)
          .map((level) => (
            <span
              key={level}
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                darkMode
                  ? "bg-blue-600 text-white"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              L{level}
            </span>
          ))}
        {selectedLevels.size > 3 && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              darkMode ? "bg-gray-600 text-white" : "bg-gray-100 text-gray-800"
            }`}
          >
            +{selectedLevels.size - 3}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex-1 text-left px-3 py-2 text-sm rounded-lg border ${
            darkMode
              ? "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              : "bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
          }`}
        >
          {getDisplayText()}
        </button>
        <button
          onClick={() => onToggleMultiSelectMode(rowIndex)}
          className={`px-2 py-1 text-xs rounded ${
            isMultiSelect
              ? darkMode
                ? "bg-blue-600 text-white"
                : "bg-blue-500 text-white"
              : darkMode
              ? "bg-gray-600 text-gray-300"
              : "bg-gray-200 text-gray-600"
          }`}
          title={
            isMultiSelect ? "Switch to single select" : "Switch to multi-select"
          }
        >
          {isMultiSelect ? "Multi" : "Single"}
        </button>
      </div>

      {getSelectedBadges()}

      {isOpen && (
        <div
          className={`absolute z-50 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto ${
            darkMode
              ? "border-gray-600 bg-gray-800 text-white"
              : "border-gray-300 bg-white text-gray-900"
          }`}
        >
          {/* Quick actions for multi-select */}
          {isMultiSelect && (
            <div
              className={`px-3 py-2 border-b ${
                darkMode ? "border-gray-600" : "border-gray-200"
              }`}
            >
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onUpdateServiceLevels(rowIndex, new Set(ALL_LEVELS));
                    setIsOpen(false);
                  }}
                  className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
                >
                  Select All
                </button>
                <button
                  onClick={() => {
                    onUpdateServiceLevels(rowIndex, new Set([1]));
                    setIsOpen(false);
                  }}
                  className="text-xs px-2 py-1 rounded bg-gray-500 text-white hover:bg-gray-600"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Service level options */}
          {ALL_LEVELS.map((level: number) => (
            <label
              key={level}
              className={`flex items-center px-3 py-2 hover:bg-opacity-10 hover:bg-blue-500 cursor-pointer ${
                darkMode ? "hover:bg-white" : "hover:bg-gray-100"
              }`}
            >
              {isMultiSelect ? (
                <input
                  type="checkbox"
                  checked={selectedLevels.has(level)}
                  onChange={() => handleMultiSelectToggle(level)}
                  className={`mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                    darkMode ? "bg-gray-700 border-gray-600" : ""
                  }`}
                />
              ) : (
                <input
                  type="radio"
                  name={`serviceLevel-${rowIndex}`}
                  checked={selectedLevels.has(level)}
                  onChange={() => handleSingleSelect(level)}
                  className={`mr-3 text-blue-600 focus:ring-blue-500 ${
                    darkMode ? "bg-gray-700 border-gray-600" : ""
                  }`}
                />
              )}
              <span className="text-sm">
                Level {level}: {SERVICE_LEVEL_DESC[level]}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

