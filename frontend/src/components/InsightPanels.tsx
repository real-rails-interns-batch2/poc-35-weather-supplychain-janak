"use client";

import type { SidebarContent } from "@/types";

interface Props {
  content: SidebarContent;
}

export default function InsightPanels({ content }: Props) {
  const panels = [
    {
      label: "Why This Matters",
      accent: "#38BDF8",
      headline: content.why_this_matters.headline,
      body: content.why_this_matters.body,
    },
    {
      label: "Who Controls the Rail",
      accent: "#818CF8",
      headline: content.who_controls.headline,
      body: content.who_controls.body,
    },
  ];

  return (
    <div className="space-y-3">
      {panels.map((panel) => (
        <section key={panel.label} className="overflow-hidden rounded-xl border border-rr-border bg-rr-surface/80">
          <div className="border-b border-rr-border px-3 py-2" style={{ background: `${panel.accent}10` }}>
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 rounded-full" style={{ background: panel.accent }} />
              <h3 className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: panel.accent }}>
                {panel.label}
              </h3>
            </div>
          </div>
          <div className="p-3">
            <p className="text-[12px] font-bold leading-snug text-white">{panel.headline}</p>
            <p className="mt-2 text-[10px] leading-relaxed text-rr-text2">{panel.body}</p>
          </div>
        </section>
      ))}
    </div>
  );
}
