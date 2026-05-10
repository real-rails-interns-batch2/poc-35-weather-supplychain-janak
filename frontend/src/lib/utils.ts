import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { RiskLevel, Severity } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const RISK_COLOR: Record<RiskLevel, string> = {
  CRITICAL: "#f87171",
  HIGH: "#fb923c",
  MEDIUM: "#fbbf24",
  LOW: "#34d399",
};

export const RISK_BG: Record<RiskLevel, string> = {
  CRITICAL: "rgba(248,113,113,0.10)",
  HIGH: "rgba(251,146,60,0.10)",
  MEDIUM: "rgba(251,191,36,0.10)",
  LOW: "rgba(52,211,153,0.10)",
};

export const SEV_COLOR: Record<Severity, string> = {
  SEVERE: "#f87171",
  MODERATE: "#fbbf24",
  LOW: "#34d399",
};

export function hexToRgb(hex: string): [number, number, number] {
  const fallback: [number, number, number] = [56, 189, 248];
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6) return fallback;
  const rgb: [number, number, number] = [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
  return rgb.some(Number.isNaN) ? fallback : rgb;
}

export function hexToRgba(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function formatUsdBn(value: number) {
  return `$${value.toFixed(value >= 10 ? 1 : 2)}B`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}