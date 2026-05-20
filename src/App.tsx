import { AppStateProvider } from "./context/AppStateContext";
import { SearchProvider } from "./context/SearchContext";
import { LabSelectionProvider } from "./context/LabSelectionContext";
import { AppContent } from "./components/upload/AppContent";

// ─────────────────────────────────────────────────────────────────────────────
// Main App Component - Wraps AppContent with Context Providers
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AppStateProvider>
      <SearchProvider>
        <LabSelectionProvider>
          <AppContent />
        </LabSelectionProvider>
      </SearchProvider>
    </AppStateProvider>
  );
}
