import { MatchResultRow, type MatchResultRowProps } from "./MatchResultRow";
import type { MatchResult } from "../../../top-level";

// Props that are used directly by the table chrome (header, Select All, etc.)
type TableOwnProps = {
  results: MatchResult[];
  bulkSelectedRows: Set<number>;
  selectAllRows: () => void;
  clearBulkSelection: () => void;
  exportResults: () => void;
  darkMode: boolean;
};

// Pass-through props for MatchResultRow — everything except index/result (supplied by the map)
type MatchResultRowPassThroughProps = Omit<MatchResultRowProps, "index" | "result">;

export type MatchResultsTableProps = TableOwnProps & MatchResultRowPassThroughProps;

export function MatchResultsTable({
  results,
  bulkSelectedRows,
  selectAllRows,
  clearBulkSelection,
  exportResults,
  darkMode,
  expandedRows,
  selectedMatches,
  multiSelectMode,
  transferLabs,
  tmsLabs,
  tmsTurnTimes,
  labCapabilityOverrides,
  onToggleRowExpansion,
  onSelectMatch,
  toggleBulkSelect,
  toggleMultiSelectMode,
  toggleServiceLevel,
  updateServiceLevel,
  updateServiceLevels,
  updatePrice,
  updateLab,
  setModalRowIndex,
  openCapabilityModal,
  removeLabCapability,
  getSelectedMatch,
  getSelectedServiceLevel,
  getSelectedServiceLevels,
  getSelectedPrice,
  getSelectedLab,
  getEligibleLabsForUnitWithOverrides,
  preferredLab,
}: MatchResultsTableProps) {
  return (
    <>
      {results.length > 0 && (
        <div
          className={`border rounded-2xl shadow-sm overflow-hidden ${
            darkMode
              ? "bg-gray-800 border-gray-600"
              : "bg-white border-slate-200"
          }`}
        >
          <div
            className={`p-4 border-b flex items-center justify-between ${
              darkMode ? "border-gray-600" : "border-slate-200"
            }`}
          >
            <h3
              className={`font-semibold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Match Results ({results.length} items)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={selectAllRows}
                className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-sm font-medium"
              >
                Select All
              </button>
              <button
                onClick={exportResults}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  darkMode
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                Export Results
              </button>
            </div>
          </div>

          <div className="overflow-auto">
            <table className={`w-full text-sm ${darkMode ? "dark" : ""}`}>
              <thead>
                <tr
                  className={`text-left ${
                    darkMode
                      ? "bg-gray-700 text-white"
                      : "bg-slate-50 text-slate-500"
                  }`}
                  style={
                    darkMode
                      ? { backgroundColor: "#374151", color: "white" }
                      : {}
                  }
                >
                  <th
                    className={`py-3 px-4 w-10 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    <input
                      type="checkbox"
                      checked={
                        bulkSelectedRows.size === results.length &&
                        results.length > 0
                      }
                      onChange={() => {
                        if (bulkSelectedRows.size === results.length) {
                          clearBulkSelection();
                        } else {
                          selectAllRows();
                        }
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Row
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Manufacturer
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Model
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Service Level
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Best Match PN
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Standards
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Lab Capacity
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Selected Price
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Turn Time
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Labs
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Capabilities
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, i) => (
                    <MatchResultRow
                      key={i}
                      index={i}
                      result={result}
                      expandedRows={expandedRows}
                      selectedMatches={selectedMatches}
                      bulkSelectedRows={bulkSelectedRows}
                      multiSelectMode={multiSelectMode}
                      transferLabs={transferLabs}
                      tmsLabs={tmsLabs}
                      tmsTurnTimes={tmsTurnTimes}
                      labCapabilityOverrides={labCapabilityOverrides}
                      onToggleRowExpansion={onToggleRowExpansion}
                      onSelectMatch={onSelectMatch}
                      toggleBulkSelect={toggleBulkSelect}
                      toggleMultiSelectMode={toggleMultiSelectMode}
                      toggleServiceLevel={toggleServiceLevel}
                      updateServiceLevel={updateServiceLevel}
                      updateServiceLevels={updateServiceLevels}
                      updatePrice={updatePrice}
                      updateLab={updateLab}
                      setModalRowIndex={setModalRowIndex}
                      openCapabilityModal={openCapabilityModal}
                      removeLabCapability={removeLabCapability}
                      getSelectedMatch={getSelectedMatch}
                      getSelectedServiceLevel={getSelectedServiceLevel}
                      getSelectedServiceLevels={getSelectedServiceLevels}
                      getSelectedPrice={getSelectedPrice}
                      getSelectedLab={getSelectedLab}
                      getEligibleLabsForUnitWithOverrides={getEligibleLabsForUnitWithOverrides}
                      darkMode={darkMode}
                      preferredLab={preferredLab}
                    />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
