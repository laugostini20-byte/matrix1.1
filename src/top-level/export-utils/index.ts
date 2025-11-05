// ─────────────────────────────────────────────────────────────────────────────
// Export Utilities for Quotes and Reports
// ─────────────────────────────────────────────────────────────────────────────

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SERVICE_LEVEL_DESC } from "../constants";
import { money } from "../utils";
import { supportsOnsiteCalibration } from "../../data/labs";
import type { Unit, MatchResult } from "../types";
import type { QuoteSummary } from "../quote-summary";

/**
 * Export quote data to Excel-compatible CSV format
 */
// Updated function signature with TMS support
export function exportQuoteToExcel(
  results: MatchResult[],
  selectedMatches: Map<number, Unit>,
  selectedPrices: Map<number, number>,
  selectedLabs: Map<number, string>,
  selectedServiceLevels: Map<number, number>,
  preferredLab?: string,
  transferLabs?: Set<number>,
  excludedItems?: Set<number>,
  tmsLabs?: Set<number>
) {
  // Create CSV content for Excel import
  const headers = [
    "Manufacturer",
    "Model",
    "Part Number",
    "Standard Time (hours)",
    "Service Level",
    "Service Level Description",
    "Lab",
    "Service Type",
    "Base Price",
    "Quantity",
  ];

  const rows = results.map((result, index) => {
    const selectedUnit = selectedMatches.get(index);
    const selectedPrice = selectedPrices.get(index);
    const selectedLab = selectedLabs.get(index);
    const selectedServiceLevel = selectedServiceLevels.get(index);

    // Check if this item is fully configured
    const isConfigured =
      selectedUnit &&
      selectedPrice &&
      selectedLab &&
      selectedServiceLevels.has(index);

    // Determine service type based on preferred lab, onsite capability, and transfer status
    let serviceType = "";

    if (excludedItems && excludedItems.has(index)) {
      serviceType = "Marked for Review";
    } else if (tmsLabs && tmsLabs.has(index)) {
      serviceType = "TMS";
    } else if (!isConfigured) {
      // Item needs more information
      serviceType = "Needs More Info";
    } else if (transferLabs && transferLabs.has(index)) {
      // If this is a transfer lab, it's a transfer
      serviceType = "Transfer";
    } else if (preferredLab && selectedLab === preferredLab) {
      // If going to preferred lab, check if it supports onsite
      if (supportsOnsiteCalibration(selectedUnit.part_number)) {
        serviceType = "Onsite/Depot Capable";
      } else {
        serviceType = "Depot Only";
      }
    } else if (preferredLab && selectedLab !== preferredLab) {
      // If not preferred lab and not marked as transfer, it's depot only
      serviceType = "Depot Only";
    } else {
      // No preferred lab set, check onsite capability
      if (supportsOnsiteCalibration(selectedUnit.part_number)) {
        serviceType = "Onsite/Depot Capable";
      } else {
        serviceType = "Depot Only";
      }
    }

    return [
      result.customerItem.manufacturer,
      result.customerItem.model,
      selectedUnit?.part_number || "No Match",
      selectedUnit?.standardTime ? selectedUnit.standardTime.toFixed(1) : "",
      selectedServiceLevel || "",
      selectedServiceLevel
        ? SERVICE_LEVEL_DESC[selectedServiceLevel] || ""
        : "",
      selectedLab || "",
      serviceType,
      selectedPrice || "",
      result.customerItem.quantity || 1,
    ];
  });

  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...rows.map((row: (string | number)[] | null) =>
      row ? row.map((cell) => `"${cell}"`).join(",") : ""
    ),
  ].join("\n");

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `onsite-quote-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export quote data to PDF format with summary and detailed breakdown
 */
export function exportQuoteToPDF(
  results: MatchResult[],
  selectedMatches: Map<number, Unit>,
  selectedPrices: Map<number, number>,
  selectedLabs: Map<number, string>,
  selectedServiceLevels: Map<number, number>,
  summary: QuoteSummary
) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(0, 113, 227);
  doc.text("Calibration Quote", 105, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 28, {
    align: "center",
  });

  // Summary Box
  doc.setFillColor(245, 245, 247);
  doc.rect(14, 35, 182, 35, "F");

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Quote Summary", 20, 43);

  doc.setFontSize(9);
  doc.text(`Total Items: ${summary.totalItems}`, 20, 50);
  doc.text(`Configured: ${summary.configuredItems}`, 20, 56);
  doc.text(`Avg. Turnaround: ${summary.avgTurnaroundTime} days`, 20, 62);

  doc.text(`Total Price: ${money(summary.totalPrice)}`, 120, 50);
  doc.text(`Max Price: ${money(summary.maxPossiblePrice)}`, 120, 56);
  doc.setTextColor(0, 128, 0);
  doc.text(`Savings: ${money(summary.savings)}`, 120, 62);
  doc.setTextColor(0, 0, 0);

  // Items Table
  const tableData: any[] = [];
  results.forEach((result, index) => {
    const selectedUnit = selectedMatches.get(index);
    const selectedPrice = selectedPrices.get(index);
    const selectedLab = selectedLabs.get(index);
    const selectedServiceLevel = selectedServiceLevels.get(index);

    if (selectedUnit && selectedPrice && selectedLab) {
      tableData.push([
        result.customerItem.manufacturer,
        result.customerItem.model,
        selectedUnit.part_number,
        `Level ${selectedServiceLevel || 1}`,
        selectedLab,
        money(selectedPrice),
      ]);
    }
  });

  autoTable(doc, {
    startY: 75,
    head: [
      ["Manufacturer", "Model", "Part #", "Service Level", "Lab", "Price"],
    ],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [0, 113, 227], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      5: { halign: "right" },
    },
  });

  // Lab Breakdown
  const finalY = (doc as any).lastAutoTable?.finalY || 100;

  if (summary.labBreakdown.length > 0) {
    doc.setFontSize(11);
    doc.text("Lab Breakdown", 14, finalY + 15);

    const labTableData = summary.labBreakdown.map(
      (lb: { lab: string; count: number; total: number }) => [
        lb.lab,
        lb.count.toString(),
        money(lb.total),
      ]
    );

    autoTable(doc, {
      startY: finalY + 20,
      head: [["Lab", "Items", "Total"]],
      body: labTableData,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        2: { halign: "right" },
      },
    });
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }

  // Save
  doc.save(`Calibration_Quote_${new Date().toISOString().split("T")[0]}.pdf`);
}
