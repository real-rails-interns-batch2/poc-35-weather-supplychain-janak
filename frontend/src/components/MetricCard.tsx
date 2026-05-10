import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "cyan" | "red" | "amber" | "green" | "muted";
}

const toneClass = {
  cyan: "text-rr-cyan border-rr-cyan/25 bg-rr-cyan/[0.06]",
  red: "text-risk-critical border-risk-critical/25 bg-risk-critical/[0.06]",
  amber: "text-risk-medium border-risk-medium/25 bg-risk-medium/[0.06]",
  green: "text-risk-low border-risk-low/25 bg-risk-low/[0.06]",
  muted: "text-rr-text2 border-rr-border bg-rr-surface/80",
};

export default function MetricCard({ label, value, sub, tone = "cyan" }: Props) {
  return (
    <div className={cn("rounded-xl border px-3 py-2 backdrop-blur-xl", toneClass[tone])}>
      <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-rr-muted">{label}</div>
      <div className="mt-1 text-[20px] font-black leading-none tracking-tight">{value}</div>
      {sub ? <div className="mt-1 text-[9px] text-rr-muted">{sub}</div> : null}
    </div>
  );
}
