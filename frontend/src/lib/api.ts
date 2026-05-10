import type {
  DataMode,
  ImpactChain,
  RiskResult,
  Scenario,
  SeaRoute,
  SidebarContent,
  SourceInfo,
  TradeRoute,
  WeatherEvent,
} from "@/types";

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

function withDataMode(path: string, dataMode: DataMode = "auto") {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}data_mode=${encodeURIComponent(dataMode)}`;
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}${body ? `: ${body}` : ""}`);
  }

  return res.json() as Promise<T>;
}

export function fetchRiskModel(scenario: Scenario = "current", routeId?: string, dataMode: DataMode = "auto") {
  const params = new URLSearchParams({ scenario, data_mode: dataMode });
  if (routeId) params.set("route_id", routeId);

  return get<{
    scenario: Scenario;
    total_routes: number;
    data: RiskResult[];
    meta: Record<string, string>;
  }>(`/api/risk-model?${params.toString()}`, { cache: "no-store" });
}

export function fetchWeatherEvents(dataMode: DataMode = "auto") {
  return get<{ count: number; events: WeatherEvent[]; data_source: string; requested_mode: DataMode }>(
    withDataMode("/api/weather-events", dataMode),
    { cache: "no-store" }
  );
}

export function fetchRoutes(dataMode: DataMode = "auto") {
  return get<{ count: number; routes: TradeRoute[]; data_source: string }>(withDataMode("/api/routes", dataMode), {
    cache: "no-store",
  });
}

export function fetchDelayTimeseries(routeId: string, daysBack = 30, dataMode: DataMode = "auto") {
  return get<{
    route_id: string;
    days_back: number;
    series: { date: string; delay_days: number; source: string }[];
    data_source: string;
  }>(withDataMode(`/api/delay-timeseries/${routeId}?days_back=${daysBack}`, dataMode), { cache: "no-store" });
}

export function fetchImpactChain(routeId: string, scenario: Scenario = "current", dataMode: DataMode = "auto") {
  return get<ImpactChain>(withDataMode(`/api/impact-chain/${routeId}?scenario=${scenario}`, dataMode), { cache: "no-store" });
}

export function fetchSourceConfidence() {
  return get<{ sources: SourceInfo[] }>("/api/source-confidence", { cache: "no-store" });
}

export function fetchSidebarContent() {
  return get<SidebarContent>("/api/sidebar-content", { cache: "no-store" });
}

export function fetchSeaRoutes() {
  return get<SeaRoute[]>("/api/sea-routes", { cache: "force-cache" });
}

export function buildDownloadUrl(scenario: Scenario = "current", dataMode: DataMode = "auto") {
  return `${BASE}/api/download/sample-data?scenario=${scenario}&data_mode=${dataMode}`;
}
