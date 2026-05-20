import type { BenchmarkStatus } from "@/lib/api";

const statusClasses: Record<BenchmarkStatus, string> = {
  queued: "border-amber-200 bg-amber-50 text-amber-800",
  running: "border-blue-200 bg-blue-50 text-blue-800 shadow-[0_0_0_3px_rgba(59,130,246,0.08)]",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  failed: "border-rose-200 bg-rose-50 text-rose-800",
};

export function StatusBadge({ status }: { status: BenchmarkStatus }) {
  return (
    <span
      className={`inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-semibold capitalize ${statusClasses[status]}`}
    >
      {status}
    </span>
  );
}
