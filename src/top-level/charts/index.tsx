// ─────────────────────────────────────────────────────────────────────────────
// Chart Components - Pure CSS/SVG
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// DonutChart Component
// ─────────────────────────────────────────────────────────────────────────────

export function DonutChart({
  data,
  title,
  darkMode = false,
}: {
  data: { label: string; value: number; color: string }[];
  title?: string;
  darkMode?: boolean;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = 0;

  const segments = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const segment = {
      ...item,
      percentage,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
    };
    currentAngle += angle;
    return segment;
  });

  const radius = 60;
  const strokeWidth = 20;
  const center = 80;

  return (
    <div
      className={`chart-container animate-fade-in ${
        darkMode ? "bg-[#1c1c1e] border-white/10" : "bg-white border-gray-200"
      }`}
    >
      {title && (
        <h4
          className={`text-sm font-semibold mb-6 ${
            darkMode ? "text-white" : "text-gray-900"
          }`}
        >
          {title}
        </h4>
      )}
      <div className="flex items-center gap-8">
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          className="flex-shrink-0"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={darkMode ? "#374151" : "#e5e7eb"}
            strokeWidth={strokeWidth}
          />
          {segments.map((segment, i) => {
            const startAngle = (segment.startAngle - 90) * (Math.PI / 180);
            const endAngle = (segment.endAngle - 90) * (Math.PI / 180);
            const x1 = center + radius * Math.cos(startAngle);
            const y1 = center + radius * Math.sin(startAngle);
            const x2 = center + radius * Math.cos(endAngle);
            const y2 = center + radius * Math.sin(endAngle);
            const largeArcFlag =
              segment.endAngle - segment.startAngle > 180 ? 1 : 0;

            return (
              <path
                key={i}
                d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                className="progress-ring transition-all duration-1000"
                strokeLinecap="round"
                style={{
                  animation: `dash 1s ease-out forwards`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            );
          })}
          <text
            x={center}
            y={center}
            textAnchor="middle"
            dy="0.3em"
            className={`text-2xl font-bold ${
              darkMode ? "fill-white" : "fill-gray-900"
            }`}
          >
            {data.length}
          </text>
        </svg>
        <div className="space-y-2">
          {data.map((item, i) => (
            <div key={i} className="chart-legend-item">
              <span
                className="chart-legend-color flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span
                className={`text-sm ${
                  darkMode ? "text-white" : "text-gray-700"
                }`}
              >
                {item.label}
              </span>
              <span
                className={`text-xs ml-auto ${
                  darkMode ? "text-gray-300" : "text-gray-500"
                }`}
              >
                {item.value} ({((item.value / total) * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HorizontalBarChart Component
// ─────────────────────────────────────────────────────────────────────────────

export function HorizontalBarChart({
  data,
  title,
  darkMode = false,
}: {
  data: { label: string; value: number; color: string; maxLabel?: string }[];
  title?: string;
  darkMode?: boolean;
}) {
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue;

  return (
    <div
      className={`chart-container animate-fade-in ${
        darkMode ? "bg-[#1c1c1e] border-white/10" : "bg-white border-gray-200"
      }`}
    >
      {title && (
        <h4
          className={`text-sm font-semibold mb-6 ${
            darkMode ? "text-white" : "text-gray-900"
          }`}
        >
          {title}
        </h4>
      )}
      <div className="space-y-4">
        {data.map((item, i) => {
          // Improved scaling for horizontal bars using linear scaling for better price representation
          let percentage;
          if (range === 0) {
            percentage = 60; // If all values are the same, show 60%
          } else {
            // Normalize to 0-1 range
            const normalized = (item.value - minValue) / range;
            // Use linear scaling for more accurate price representation
            // Map to 15-95% range for better visual spread
            percentage = Math.max(normalized * 80 + 15, 12);
          }

          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between items-center">
                <span
                  className={`text-sm font-medium ${
                    darkMode ? "text-white" : "text-gray-700"
                  }`}
                >
                  {item.label}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {item.maxLabel || item.value}
                </span>
              </div>
              <div
                className={`w-full h-4 rounded-full overflow-hidden ${
                  darkMode ? "bg-gray-700" : "bg-gray-200"
                }`}
              >
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${percentage}%`,
                    background: item.color,
                    animation: "bar-grow-horizontal 0.8s ease-out",
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
