"use client";

import { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { fetchDelayTimeseries } from "@/lib/api";
import { hexToRgba } from "@/lib/utils";

import type { DataMode } from "@/types";

interface Props {
  routeId: string;
  riskColor: string;
  dataMode: DataMode;
}

type Point = { date: string; delay_days: number; source?: string };

export default function DelayChart({ routeId, riskColor, dataMode }: Props) {
  const [series, setSeries] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchDelayTimeseries(routeId, 30, dataMode)
      .then((response) => {
        if (!cancelled) setSeries(response.series);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [routeId, dataMode]);

  const option = useMemo(() => ({
    backgroundColor: "transparent",
    grid: { top: 10, right: 8, bottom: 24, left: 34 },
    xAxis: {
      type: "category",
      data: series.map((point) => point.date),
      axisLine: { lineStyle: { color: "#1F2937" } },
      axisTick: { show: false },
      axisLabel: {
        color: "#4B5563",
        fontSize: 9,
        formatter: (value: string) => {
          const date = new Date(value);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        },
        interval: 4,
      },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#1F2937", type: "dashed" } },
      axisLabel: { color: "#4B5563", fontSize: 9 },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "#0B1117",
      borderColor: "#1F2937",
      textStyle: { color: "#F9FAFB", fontSize: 11 },
      formatter: (params: any[]) => {
        const point = params[0];
        return `<div style="padding:4px 6px"><span style="color:#9CA3AF">${point.axisValue}</span><br/><b>${Number(point.value).toFixed(1)}d delay</b></div>`;
      },
    },
    series: [
      {
        type: "line",
        data: series.map((point) => point.delay_days),
        smooth: true,
        symbol: "none",
        lineStyle: { color: riskColor, width: 2 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: hexToRgba(riskColor, 0.32) },
              { offset: 1, color: hexToRgba(riskColor, 0) },
            ],
          },
        },
      },
    ],
  }), [riskColor, series]);

  if (loading) {
    return <div className="flex h-full items-center justify-center text-[10px] text-rr-muted rr-pulse">Loading delay history…</div>;
  }

  if (error) {
    return <div className="flex h-full items-center justify-center text-[10px] text-risk-critical">Failed to load delay chart</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-rr-muted">30-day delay signal</div>
          <div className="text-[10px] text-rr-text2">{dataMode === "synthetic" ? "Synthetic delay curve" : "Live attempt with fallback-safe delay curve"}</div>
        </div>
        <div className="rounded-full border border-rr-border bg-rr-base px-2 py-0.5 font-mono text-[9px] text-rr-muted">
          {series.length} pts
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
}
