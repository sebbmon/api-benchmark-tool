import type { BenchmarkMetricPoint } from "@/lib/api";

type LineChartProps = {
  points: BenchmarkMetricPoint[];
};

const width = 720;
const height = 260;
const padding = 28;

function buildPath(values: number[], maxValue: number): string {
  if (!values.length) {
    return "";
  }

  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  return values
    .map((value, index) => {
      const x =
        padding + (values.length === 1 ? 0 : (index / (values.length - 1)) * innerWidth);
      const y = padding + innerHeight - (value / maxValue) * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function LineChart({ points }: LineChartProps) {
  const visible = points.slice(-60);
  const rps = visible.map((point) => Number(point.requestsPerSecond) || 0);
  const p95 = visible.map((point) => Number(point.p95LatencyMs) || 0);
  const maxValue = Math.max(1, ...rps, ...p95);
  const rpsPath = buildPath(rps, maxValue);
  const p95Path = buildPath(p95, maxValue);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Live trend</h2>
          <p className="text-sm text-slate-500">Last 60 metric points</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
            RPS
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
            p95 ms
          </span>
        </div>
      </div>

      <div className="mt-4 h-64 w-full overflow-hidden">
        {visible.length ? (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="Line chart for requests per second and p95 latency"
            className="h-full w-full"
            preserveAspectRatio="none"
          >
            <line
              x1={padding}
              y1={height - padding}
              x2={width - padding}
              y2={height - padding}
              className="stroke-slate-200"
              strokeWidth="2"
            />
            <line
              x1={padding}
              y1={padding}
              x2={padding}
              y2={height - padding}
              className="stroke-slate-200"
              strokeWidth="2"
            />
            <path
              d={rpsPath}
              fill="none"
              className="stroke-blue-600"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
            <path
              d={p95Path}
              fill="none"
              className="stroke-rose-500"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-slate-200 text-sm text-slate-500">
            Waiting for live metrics
          </div>
        )}
      </div>
    </div>
  );
}
