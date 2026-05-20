// Re-export everything from constants, types, utils, charts, upload, and new modules
export * from "./constants";
export * from "./types";
export * from "./utils";
export * from "./charts";
export * from "./upload";
export * from "./quote-summary";
export * from "./export-utils";
export * from "./pricing-utils";

export type {
  Recommendation,
  OptimizationStrategy,
  OptimizationResult,
} from "./optimization-utils";
export {
  generateRecommendations,
  optimizeSelections,
} from "./optimization-utils";

// Re-export quote summary types and functions
export type { QuoteSummary } from "./quote-summary";
export { calculateQuoteSummary } from "./quote-summary";

// Re-export export utilities
export { exportQuoteToExcel, exportQuoteToPDF } from "./export-utils";

// Re-export pricing utilities
export { 
  roundCents, 
  calculateServiceLevelPrice, 
  generatePricingRows, 
  normalizePricing 
} from "./pricing-utils";
