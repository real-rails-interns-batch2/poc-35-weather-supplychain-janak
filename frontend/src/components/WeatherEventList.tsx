"use client";

import { SEV_COLOR } from "@/lib/utils";
import type { WeatherEvent } from "@/types";

const SEV_ICON: Record<string, string> = {
  SEVERE: "●",
  MODERATE: "●",
  LOW: "●",
};

interface Props {
  events: WeatherEvent[];
  activeRouteId?: string | null;
}

export default function WeatherEventList({ events, activeRouteId }: Props) {
  const filtered = activeRouteId ? events.filter((event) => event.affected_routes.includes(activeRouteId)) : events;

  if (!filtered.length) {
    return (
      <div className="rounded-xl border border-rr-border bg-rr-surface/70 px-4 py-8 text-center">
        <div className="text-[11px] font-semibold text-rr-text2">
          {activeRouteId ? "No active events on this route." : "No active weather events."}
        </div>
        <div className="mt-1 text-[9px] text-rr-muted">The model will keep synthetic fallback ready for demo continuity.</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((event) => {
        const color = SEV_COLOR[event.severity] ?? "#9CA3AF";

        return (
          <div
            key={event.id}
            className="overflow-hidden rounded-xl border border-rr-border bg-rr-surface/80"
            style={{ borderLeft: `3px solid ${color}` }}
          >
            <div className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="rr-pulse text-xs" style={{ color }}>{SEV_ICON[event.severity]}</span>
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-bold text-white">{event.type}</div>
                    <div className="truncate text-[9px] text-rr-muted">{event.region}</div>
                  </div>
                </div>
                <span className="rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em]" style={{ color, borderColor: color }}>
                  {event.severity}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: "Duration", value: `${event.estimated_duration_days}d` },
                  { label: "Delay ×", value: event.delay_multiplier.toFixed(2), color },
                  { label: "Routes", value: event.affected_routes.join(", ") },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="text-[7px] font-bold uppercase tracking-[0.12em] text-rr-muted">{item.label}</div>
                    <div className="mt-0.5 truncate font-mono text-[10px] font-semibold text-rr-text2" style={{ color: item.color }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
