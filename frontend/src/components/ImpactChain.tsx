"use client";

import { useEffect, useState } from "react";
import { fetchImpactChain } from "@/lib/api";
import type { DataMode, ImpactChain as ImpactChainData, ImpactNode, Scenario } from "@/types";

const TYPE_COLOR: Record<ImpactNode["type"], string> = {
  trigger: "#f87171",
  impact: "#fb923c",
  consequence: "#fbbf24",
};

interface Props {
  routeId: string;
  scenario: Scenario;
  dataMode: DataMode;
}

function formatValue(node: ImpactNode) {
  if (node.type === "trigger") return `${node.value} event${node.value === 1 ? "" : "s"}`;
  if (node.id === "cost_impact") return `$${node.value}M`;
  return `${node.value}d`;
}

export default function ImpactChain({ routeId, scenario, dataMode }: Props) {
  const [data, setData] = useState<ImpactChainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchImpactChain(routeId, scenario, dataMode)
      .then((response) => {
        if (!cancelled) setData(response);
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
  }, [routeId, scenario, dataMode]);

  if (loading) {
    return <div className="flex h-full items-center justify-center text-[10px] text-rr-muted rr-pulse">Loading cascade…</div>;
  }

  if (error || !data) {
    return <div className="flex h-full items-center justify-center text-[10px] text-risk-critical">Failed to load impact chain</div>;
  }

  const groups: Record<ImpactNode["type"], ImpactNode[]> = {
    trigger: data.nodes.filter((node) => node.type === "trigger"),
    impact: data.nodes.filter((node) => node.type === "impact"),
    consequence: data.nodes.filter((node) => node.type === "consequence"),
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-rr-muted">Impact cascade</div>
          <div className="text-[10px] text-rr-text2">
            <span className="text-rr-cyan">{scenario}</span> · {dataMode} data · score {data.risk_score}/100
          </div>
        </div>
        <div className="rounded-full border border-rr-border bg-rr-base px-2 py-0.5 text-[9px] font-bold uppercase text-rr-muted">
          {data.risk_level}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-2 overflow-auto pr-1">
        {(["trigger", "impact", "consequence"] as const).map((type, index) => (
          <div key={type} className="contents">
            {index > 0 ? <div className="pt-11 text-center text-rr-border2">→</div> : null}
            <div className="min-w-0 space-y-1.5">
              <div className="text-center text-[8px] font-black uppercase tracking-[0.18em] text-rr-muted">{type}</div>
              {groups[type].map((node) => {
                const color = TYPE_COLOR[node.type];
                return (
                  <div key={node.id} className="rounded-lg border px-2 py-2 text-center" style={{ borderColor: color, background: `${color}14` }}>
                    <div className="truncate text-[9px] font-bold" style={{ color }} title={node.label}>
                      {node.label}
                    </div>
                    <div className="mt-1 font-mono text-[12px] font-black text-white">{formatValue(node)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
