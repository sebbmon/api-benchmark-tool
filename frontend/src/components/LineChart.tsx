"use client";

import {
  Area,
  Brush,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BenchmarkMetricPoint } from "@/lib/api";

type LineChartProps = {
  points: BenchmarkMetricPoint[];
};

type ChartPoint = {
  label: string;
  rps: number;
  avgLatency: number;
  p95Latency: number;
};

function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatTime(value: string, fallback: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return `#${fallback + 1}`;
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatAxisTick(value: number): string {
  if (value >= 1000) {
    return `${formatNumber(value / 1000, 1)}k`;
  }
  return formatNumber(value, value >= 10 ? 0 : 1);
}

function formatTooltipValue(value: unknown, name: unknown): string {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return String(value ?? "-");
  }

  const metricName = String(name).toLowerCase();
  if (metricName.includes("latency")) {
    return `${formatNumber(numericValue, 1)} ms`;
  }
  if (metricName.includes("rps")) {
    return `${formatNumber(numericValue, 1)} req/s`;
  }
  return formatNumber(numericValue, 1);
}

function toChartPoint(point: BenchmarkMetricPoint, index: number): ChartPoint {
  return {
    label: formatTime(point.timestamp, index),
    rps: Number(point.requestsPerSecond) || 0,
    avgLatency: Number(point.avgLatencyMs) || 0,
    p95Latency: Number(point.p95LatencyMs) || 0,
  };
}

export function LineChart({ points }: LineChartProps) {
  const visible = points.slice(-120);
  const chartData = visible.map(toChartPoint);

  return (
    <div className="rounded-lg border border-slate-200/80 bg-white/95 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Live trend</h2>
          <p className="mt-1 text-sm text-slate-500">Last 120 metric points</p>
        </div>
        {chartData.length ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
            Hover for exact values, drag the range below to zoom
          </div>
        ) : null}
      </div>

      <div className="mt-5 h-80 w-full">
        {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 12, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="rpsFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                minTickGap={28}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                yAxisId="rps"
                tickFormatter={formatAxisTick}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <YAxis
                yAxisId="latency"
                orientation="right"
                tickFormatter={(value) => `${formatAxisTick(Number(value))} ms`}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={58}
              />
              <Tooltip
                cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }}
                formatter={(value, name) => [formatTooltipValue(value, name), name]}
                labelStyle={{ color: "#0f172a", fontWeight: 600, marginBottom: 8 }}
                contentStyle={{
                  background: "rgba(255,255,255,0.98)",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  boxShadow: "0 18px 50px rgba(15,23,42,0.14)",
                  color: "#334155",
                  fontSize: 12,
                }}
              />
              <Legend
                align="right"
                iconType="circle"
                verticalAlign="top"
                wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
              />
              <Area
                yAxisId="rps"
                type="monotone"
                dataKey="rps"
                name="RPS"
                fill="url(#rpsFill)"
                stroke="#2563eb"
                strokeWidth={2.25}
                activeDot={{ r: 5, strokeWidth: 2 }}
                dot={false}
              />
              <Line
                yAxisId="latency"
                type="monotone"
                dataKey="avgLatency"
                name="Avg latency"
                stroke="#0f766e"
                strokeWidth={2.25}
                activeDot={{ r: 5, strokeWidth: 2 }}
                dot={false}
              />
              <Line
                yAxisId="latency"
                type="monotone"
                dataKey="p95Latency"
                name="p95 latency"
                stroke="#e11d48"
                strokeWidth={2.25}
                activeDot={{ r: 5, strokeWidth: 2 }}
                dot={false}
              />
              <Brush
                dataKey="label"
                height={24}
                travellerWidth={8}
                stroke="#94a3b8"
                fill="#f8fafc"
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
            Waiting for live metrics
          </div>
        )}
      </div>
    </div>
  );
}
