import { clsx } from "../../top-level";

type DiagnosticsProps = {
  tests: { name: string; pass: boolean; details?: string }[];
};

export function Diagnostics({ tests }: DiagnosticsProps) {
  return (
    <section className="mt-8 border border-slate-200 bg-white rounded-2xl p-4">
      <div className="text-sm font-semibold mb-2">Diagnostics</div>
      <ul className="space-y-1">
        {tests.map((t, i) => (
          <li key={i} className="text-sm">
            <span
              className={clsx(
                "mr-2 font-medium",
                t.pass ? "text-green-700" : "text-red-700"
              )}
            >
              {t.pass ? "PASS" : "FAIL"}
            </span>
            <span className="font-medium">{t.name}</span>
            {t.details && (
              <span className="ml-2 text-slate-500">({t.details})</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
