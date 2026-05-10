"use client";

import type { SourceInfo } from "@/types";

const STATUS_COLOR = {
  LIVE: "#34d399",
  MOCK: "#4B5563",
  ACTIVE: "#38BDF8",
} as const;

interface Props {
  sources: SourceInfo[];
}

export default function SourcePanel({ sources }: Props) {
  return (
    <div className="space-y-2">
      {sources.map((source) => {
        const color = STATUS_COLOR[source.status] ?? "#4B5563";
        const isLive = source.status === "LIVE" || source.status === "ACTIVE";

        return (
          <div key={source.name} className="rounded-xl border border-rr-border bg-rr-surface/80 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: color, boxShadow: isLive ? `0 0 10px ${color}` : undefined }}
                />
                <span className="truncate text-[12px] font-bold text-white">{source.name}</span>
              </div>
              <span className="text-[8px] font-black uppercase tracking-[0.16em]" style={{ color }}>
                {source.status}
              </span>
            </div>

            <p className="mt-2 text-[10px] leading-relaxed text-rr-muted">{source.note}</p>

            {source.confidence > 0 ? (
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-rr-muted">Confidence</span>
                  <span className="font-mono text-[9px]" style={{ color }}>{source.confidence}%</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-rr-border">
                  <div className="h-full rounded-full" style={{ width: `${source.confidence}%`, background: color }} />
                </div>
              </div>
            ) : null}

            <div className="mt-3 flex items-center justify-between gap-2 text-[8px]">
              {source.url ? (
                <a href={source.url} target="_blank" rel="noreferrer" className="truncate text-rr-cyan/75 hover:text-rr-cyan">
                  {source.url.replace("https://", "").split("/")[0]}
                </a>
              ) : (
                <span className="text-rr-muted">Local fallback</span>
              )}

              {source.env_var && source.status !== "LIVE" ? (
                <span className="rounded border border-rr-border bg-rr-base px-1.5 py-0.5 font-mono text-rr-muted">
                  {source.env_var}=missing
                </span>
              ) : source.last_refresh ? (
                <span className="font-mono text-rr-muted">↻ {new Date(source.last_refresh).toLocaleTimeString()}</span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
