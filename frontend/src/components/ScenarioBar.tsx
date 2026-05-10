"use client";

import { cn } from "@/lib/utils";
import type { Scenario } from "@/types";

const OPTIONS: { value: Scenario; label: string; desc: string; color: string }[] = [
  { value: "optimistic", label: "Optimistic", desc: "0.6× shock", color: "#34d399" },
  { value: "current", label: "Current", desc: "1.0× shock", color: "#38BDF8" },
  { value: "pessimistic", label: "Pessimistic", desc: "1.5× shock", color: "#f87171" },
];

interface Props {
  value: Scenario;
  onChange: (scenario: Scenario) => void;
}

export default function ScenarioBar({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl border border-rr-border bg-rr-surface/80 p-1 shadow-2xl shadow-black/30">
      {OPTIONS.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-lg border px-3 py-2 text-left transition-all duration-200",
              active
                ? "border-current bg-white/[0.03] shadow-[0_0_0_0.5px_currentColor]"
                : "border-transparent text-rr-muted hover:border-rr-border2 hover:bg-rr-surface2 hover:text-rr-text2"
            )}
            style={{ color: active ? option.color : undefined }}
            aria-pressed={active}
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.16em]">{option.label}</div>
            <div className="mt-0.5 text-[9px] text-rr-muted">{option.desc}</div>
          </button>
        );
      })}
    </div>
  );
}
