"use client";

import { DatabaseZap, RadioTower, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DataMode } from "@/types";

const OPTIONS: { value: DataMode; label: string; desc: string; icon: typeof DatabaseZap }[] = [
  { value: "auto", label: "AUTO", desc: "live + fallback", icon: ShieldCheck },
  { value: "live", label: "LIVE", desc: "try APIs first", icon: RadioTower },
  { value: "synthetic", label: "SYNTH", desc: "demo stable", icon: DatabaseZap },
];

interface Props {
  value: DataMode;
  onChange: (mode: DataMode) => void;
}

export default function DataModeSwitch({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl border border-rr-border bg-rr-base p-1">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-lg border px-2 py-1.5 text-left transition-all duration-150",
              active
                ? "border-rr-cyan/50 bg-rr-cyan/10 text-rr-cyan rr-glow-sm"
                : "border-transparent text-rr-muted hover:border-rr-border2 hover:bg-rr-surface2 hover:text-rr-text2"
            )}
            title={option.desc}
          >
            <div className="flex items-center gap-1.5">
              <Icon className="h-3 w-3" />
              <span className="text-[9px] font-black tracking-[0.12em]">{option.label}</span>
            </div>
            <div className="mt-0.5 truncate text-[7px] font-semibold uppercase tracking-[0.12em] opacity-70">
              {option.desc}
            </div>
          </button>
        );
      })}
    </div>
  );
}
