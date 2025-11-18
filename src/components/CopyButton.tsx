import React, { useState } from "react";
import { clsx } from "../top-level";

export function CopyButton({
  label,
  toCopy,
  darkMode,
}: {
  label: string;
  toCopy: string;
  darkMode?: boolean;
}) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(toCopy);
        setOk(true);
        setTimeout(() => setOk(false), 1200);
      }}
      className={clsx(
        "rounded-xl px-3 py-2 text-sm border",
        ok
          ? "border-green-400 bg-green-50"
          : darkMode
          ? "border-gray-600 bg-gray-800 hover:bg-gray-700 text-white"
          : "border-slate-300 bg-white hover:bg-slate-50"
      )}
      title="Copy to clipboard"
    >
      {ok ? "Copied!" : label}
    </button>
  );
}

