import { getLabCapabilitiesForUnit } from "../../data/labs";

type LabCapabilityModalProps = {
  capabilityModalOpen: boolean;
  capabilityModalData: {
    rowIndex: number;
    partNumber: string;
    requiredCapabilityTags: any[];
  } | null;
  closeCapabilityModal: () => void;
  addLabCapability: (labCode: string, partNumber: string) => void;
  getSelectedLab: (rowIndex: number) => string;
  labCapabilityOverrides: Map<string, Set<string>>;
  darkMode: boolean;
};

export function LabCapabilityModal({
  capabilityModalOpen,
  capabilityModalData,
  closeCapabilityModal,
  addLabCapability,
  getSelectedLab,
  labCapabilityOverrides,
  darkMode,
}: LabCapabilityModalProps) {
  if (!capabilityModalOpen || !capabilityModalData) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h3
            className={`text-lg font-semibold ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Add Lab Capability
          </h3>
          <button
            onClick={closeCapabilityModal}
            className={`text-gray-400 hover:text-gray-600 ${
              darkMode ? "hover:text-gray-300" : "hover:text-gray-600"
            }`}
          >
            ✕
          </button>
        </div>

        <div
          className={`text-sm mb-4 ${
            darkMode ? "text-gray-300" : "text-gray-600"
          }`}
        >
          Part Number:{" "}
          <span className="font-mono font-medium">
            {capabilityModalData.partNumber}
          </span>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {getLabCapabilitiesForUnit({
            partNumber: capabilityModalData.partNumber,
            requiredCapabilityTags:
              capabilityModalData.requiredCapabilityTags,
          })
            .filter(
              (lab) =>
                lab.labName !== getSelectedLab(capabilityModalData.rowIndex)
            )
            .filter((lab) => !lab.canCalibrate)
            .filter((lab) => {
              // Exclude labs that already have capability artificially added
              const overrides = labCapabilityOverrides.get(lab.labCode);
              return (
                !overrides ||
                !overrides.has(`ADD:${capabilityModalData.partNumber}`)
              );
            })
            .map((lab, labIndex) => (
              <div
                key={labIndex}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  darkMode
                    ? "bg-gray-700 border-gray-600"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex-1">
                  <div
                    className={`font-medium ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {lab.labName}
                  </div>
                  <div
                    className={`text-sm ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {lab.region} • {lab.matchingStandards.length} matching
                    standards
                    {lab.isAccredited && (
                      <span className="ml-2 text-green-600">
                        ✓ Accredited
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    addLabCapability(
                      lab.labCode,
                      capabilityModalData.partNumber
                    );
                    closeCapabilityModal();
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
                >
                  Add Capability
                </button>
              </div>
            ))}

          {getLabCapabilitiesForUnit({
            partNumber: capabilityModalData.partNumber,
            requiredCapabilityTags:
              capabilityModalData.requiredCapabilityTags,
          })
            .filter(
              (lab) =>
                lab.labName !== getSelectedLab(capabilityModalData.rowIndex)
            )
            .filter((lab) => !lab.canCalibrate)
            .filter((lab) => {
              const overrides = labCapabilityOverrides.get(lab.labCode);
              return (
                !overrides ||
                !overrides.has(`ADD:${capabilityModalData.partNumber}`)
              );
            }).length === 0 && (
            <div
              className={`text-center py-8 ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              All labs already have capability for this item
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={closeCapabilityModal}
            className={`px-4 py-2 rounded ${
              darkMode
                ? "bg-gray-600 text-white hover:bg-gray-500"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            } transition-colors`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
