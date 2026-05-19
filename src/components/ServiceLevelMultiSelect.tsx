import { useState, useRef, useEffect } from "react";
import { ALL_LEVELS, SERVICE_LEVEL_DESC } from "../top-level";

type ServiceLevelMultiSelectProps = {
  selectedLevels: Set<number>;
  onSelectionChange: (levels: Set<number>) => void;
  darkMode: boolean;
};

export function ServiceLevelMultiSelect({
  selectedLevels,
  onSelectionChange,
  darkMode,
}: ServiceLevelMultiSelectProps) {
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

  const toggleLevel = (level: number) => {
    const newSelection = new Set(selectedLevels);
    if (newSelection.has(level)) {
      newSelection.delete(level);
    } else {
      newSelection.add(level);
    }
    onSelectionChange(newSelection);
  };

  const selectAll = () => {
    onSelectionChange(new Set(ALL_LEVELS));
  };

  const selectNone = () => {
    onSelectionChange(new Set());
  };

  const getDisplayText = () => {
    if (selectedLevels.size === 0) return "Select service levels...";
    if (selectedLevels.size === ALL_LEVELS.length) return "All service levels";
    if (selectedLevels.size <= 4) {
      return Array.from(selectedLevels)
        .sort((a, b) => a - b)
        .map((level) => `L${level}`)
        .join(", ");
    }
    return `${selectedLevels.size} service levels selected`;
  };

  const getSelectedBadges = () => {
    if (selectedLevels.size === 0 || selectedLevels.size > 4) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Array.from(selectedLevels)
          .sort((a, b) => a - b)
          .map((level) => (
            <span
              key={level}
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                darkMode
                  ? "bg-blue-900 text-blue-200"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              L{level}
            </span>
          ))}
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`w-full border rounded-lg ${
          darkMode
            ? "border-gray-600 bg-[#1c1c1e] text-white"
            : "border-gray-300 bg-white text-gray-900"
        } hover:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500`}
      >
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left px-3 py-2 text-sm flex items-center justify-between focus:outline-none"
        >
          <span className="truncate">{getDisplayText()}</span>
          <svg
            className={`w-4 h-4 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {getSelectedBadges()}
      </div>

      {isOpen && (
        <div
          className={`absolute z-50 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto ${
            darkMode
              ? "border-gray-600 bg-[#1c1c1e] text-white"
              : "border-gray-300 bg-white text-gray-900"
          }`}
        >
          {/* Quick actions */}
          <div
            className={`px-3 py-2 border-b ${
              darkMode ? "border-gray-600" : "border-gray-200"
            }`}
          >
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
              >
                Select All
              </button>
              <button
                onClick={selectNone}
                className="text-xs px-2 py-1 rounded bg-gray-500 text-white hover:bg-gray-600"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Service level options */}
          {ALL_LEVELS.map((level: number) => (
            <label
              key={level}
              className={`flex items-center px-3 py-2 hover:bg-opacity-10 hover:bg-blue-500 cursor-pointer ${
                darkMode ? "hover:bg-white" : "hover:bg-gray-100"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedLevels.has(level)}
                onChange={() => toggleLevel(level)}
                className={`mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                  darkMode ? "bg-gray-700 border-gray-600" : ""
                }`}
              />
              <span className="text-sm">
                Level {level} - {SERVICE_LEVEL_DESC[level]}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
