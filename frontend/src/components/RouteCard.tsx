"use client";

import { formatUsdBn, RISK_BG, RISK_COLOR, cn } from "@/lib/utils";
import type { RiskResult } from "@/types";

interface Props {
  route: RiskResult;
  isSelected: boolean;
  onClick: () => void;
}

export default function RouteCard({ route, isSelected, onClick }: Props) {
  const color = RISK_COLOR[route.risk_level] ?? "#38BDF8";
  const bg = RISK_BG[route.risk_level] ?? "transparent";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl border p-3 text-left transition-all duration-200",
        "border-rr-border bg-rr-surface/80 hover:-translate-y-0.5 hover:border-rr-border2 hover:bg-rr-surface2",
        isSelected && "rr-glow-sm"
      )}
      style={{
        borderLeft: `3px solid ${color}`,
        background: isSelected ? `linear-gradient(135deg, ${bg}, rgba(11,17,23,0.88))` : undefined,
        borderColor: isSelected ? color : undefined,
      }}
    >
      {isSelected ? <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-rr-cyan/70" /> : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[9px] text-rr-muted">{route.id}</div>
          <div className="mt-0.5 truncate text-[13px] font-bold leading-tight text-white" title={route.name}>
            {route.name}
          </div>
        </div>

        <span
          className="shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em]"
          style={{ color, borderColor: color, background: bg }}
        >
          {route.risk_level}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[10px] text-rr-text2">
        <span className="truncate">{route.origin.city}</span>
        <span className="text-rr-muted">→</span>
        <span className="truncate">{route.destination.city}</span>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-rr-muted">Risk score</span>
          <span className="font-mono text-[10px] font-bold" style={{ color }}>
            {route.risk_score}/100
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-rr-border">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(route.risk_score, 100)}%`, background: color }}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {[
          { label: "Base", value: `${route.baseline_days}d` },
          { label: "Total", value: `${route.estimated_total_days}d`, color },
          { label: "Delay", value: route.estimated_delay_days > 0 ? `+${route.estimated_delay_days}d` : "—", color },
          { label: "Volume", value: formatUsdBn(route.annual_volume_bn) },
        ].map((item) => (
          <div key={item.label}>
            <div className="text-[7px] font-bold uppercase tracking-[0.12em] text-rr-muted">{item.label}</div>
            <div className="mt-0.5 truncate font-mono text-[10px] font-semibold text-rr-text2" style={{ color: item.color }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {isSelected ? (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-rr-border pt-2.5">
          {route.commodities.map((commodity) => (
            <span key={commodity} className="rounded-md border border-rr-border bg-rr-base/50 px-1.5 py-0.5 text-[9px] text-rr-text2">
              {commodity}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}
