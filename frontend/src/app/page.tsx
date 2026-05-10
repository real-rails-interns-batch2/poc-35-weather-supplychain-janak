"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Activity, AlertTriangle, Download, RefreshCw, ShieldCheck } from "lucide-react";
import DataModeSwitch from "@/components/DataModeSwitch";
import DelayChart from "@/components/DelayChart";
import ImpactChain from "@/components/ImpactChain";
import InsightPanels from "@/components/InsightPanels";
import MetricCard from "@/components/MetricCard";
import RouteCard from "@/components/RouteCard";
import ScenarioBar from "@/components/ScenarioBar";
import SourcePanel from "@/components/SourcePanel";
import WeatherEventList from "@/components/WeatherEventList";
import {
  buildDownloadUrl,
  fetchRiskModel,
  fetchSeaRoutes,
  fetchSidebarContent,
  fetchSourceConfidence,
  fetchWeatherEvents,
} from "@/lib/api";
import { formatUsdBn, RISK_COLOR } from "@/lib/utils";
import type { DataMode, RiskResult, Scenario, SidebarContent, SourceInfo, WeatherEvent } from "@/types";

const WorldMap = dynamic(() => import("@/components/WorldMap"), { ssr: false });

type SideTab = "routes" | "weather" | "insights" | "sources";

const DEFAULT_SIDEBAR: SidebarContent = {
  why_this_matters: {
    headline: "This is where data rails become operating rails.",
    body: "Supply chains are physical networks, not spreadsheet rows. A port disruption, weather shock, or canal constraint can move through inventory, customs, shipping cost, and delivery reliability before teams see the delay on a dashboard.",
  },
  who_controls: {
    headline: "Weather data, port infrastructure, and trade reporting are separate control layers.",
    body: "National weather agencies control the climate signal, state and quasi-state authorities control chokepoints, and private freight platforms control much of the real-time visibility layer.",
  },
};

const TABS: { id: SideTab; label: string }[] = [
  { id: "routes", label: "Routes" },
  { id: "weather", label: "Weather" },
  { id: "insights", label: "Intel" },
  { id: "sources", label: "Sources" },
];

export default function DashboardPage() {
  const [routes, setRoutes] = useState<RiskResult[]>([]);
  const [events, setEvents] = useState<WeatherEvent[]>([]);
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [sidebar, setSidebar] = useState<SidebarContent>(DEFAULT_SIDEBAR);
  const [seaCoords, setSeaCoords] = useState<Record<string, [number, number][]>>({});
  const [scenario, setScenario] = useState<Scenario>("current");
  const [dataMode, setDataMode] = useState<DataMode>("auto");
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [sideTab, setSideTab] = useState<SideTab>("routes");
  const [dataSource, setDataSource] = useState("SYNTHETIC");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const scenarioRef = useRef<Scenario>(scenario);
  const dataModeRef = useRef<DataMode>(dataMode);
  scenarioRef.current = scenario;
  dataModeRef.current = dataMode;

  const loadData = useCallback(async (activeScenario: Scenario, activeDataMode: DataMode) => {
    setLoading(true);
    setError(null);

    try {
      const [riskResponse, eventResponse] = await Promise.all([
        fetchRiskModel(activeScenario, undefined, activeDataMode),
        fetchWeatherEvents(activeDataMode),
      ]);

      if (scenarioRef.current !== activeScenario || dataModeRef.current !== activeDataMode) return;

      setRoutes(riskResponse.data);
      setEvents(eventResponse.events);
      setDataSource(riskResponse.meta?.data_source ?? "SYNTHETIC");
      setLastUpdated(new Date().toLocaleTimeString());
      setSelectedRoute((current) => current && riskResponse.data.some((route) => route.id === current) ? current : null);
    } catch (err) {
      if (scenarioRef.current !== activeScenario || dataModeRef.current !== activeDataMode) return;
      setError(err instanceof Error ? err.message : "Failed to load risk model");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSourceConfidence().then((response) => setSources(response.sources)).catch(console.error);
    fetchSidebarContent().then(setSidebar).catch(() => setSidebar(DEFAULT_SIDEBAR));
    fetchSeaRoutes()
      .then((response) => {
        const routesById: Record<string, [number, number][]> = {};
        response.forEach((route) => {
          routesById[route.id] = route.coords;
        });
        setSeaCoords(routesById);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    void loadData(scenario, dataMode);
  }, [scenario, dataMode, loadData]);

  const selected = useMemo(() => routes.find((route) => route.id === selectedRoute) ?? null, [routes, selectedRoute]);
  const selectedColor = selected ? RISK_COLOR[selected.risk_level] : "#38BDF8";
  const highRiskCount = routes.filter((route) => route.risk_level === "CRITICAL" || route.risk_level === "HIGH").length;
  const totalVolume = routes.reduce((sum, route) => sum + route.annual_volume_bn, 0);
  const avgDelay = routes.length ? routes.reduce((sum, route) => sum + route.estimated_delay_days, 0) / routes.length : 0;
  const liveMode = dataSource !== "SYNTHETIC";
  const modeLabel = dataMode === "synthetic" ? "Forced synthetic" : dataMode === "live" ? "Live first" : "Auto fallback";
  const filteredEvents = selectedRoute ? events.filter((event) => event.affected_routes.includes(selectedRoute)) : events;

  const handleSelectRoute = useCallback((id: string | null) => {
    setSelectedRoute(id);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-rr-base text-white">
      <header className="flex h-[58px] shrink-0 items-center justify-between gap-4 border-b border-rr-border bg-rr-surface/95 px-5 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-rr-cyan/30 bg-rr-cyan/10 rr-glow-sm">
            <Activity className="h-4 w-4 text-rr-cyan" />
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-black tracking-tight">REAL RAILS</div>
            <div className="truncate text-[10px] text-rr-muted">PoC #35 · Weather-to-Supply Chain Risk</div>
          </div>
        </div>

        <div className="hidden min-w-[620px] max-w-[760px] flex-1 grid-cols-[1.15fr_0.85fr] gap-2 xl:grid">
          <ScenarioBar value={scenario} onChange={setScenario} />
          <DataModeSwitch value={dataMode} onChange={setDataMode} />
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-xl border border-rr-border bg-rr-base px-3 py-2 md:flex">
            <div className={`h-2 w-2 rounded-full ${liveMode ? "bg-risk-low" : "bg-rr-muted"}`} style={liveMode ? { boxShadow: "0 0 8px #34d399" } : undefined} />
            <div>
              <div className="text-[8px] font-black uppercase tracking-[0.18em] text-rr-muted">{modeLabel}</div>
              <div className="max-w-[160px] truncate text-[10px] font-bold text-rr-text2">{dataSource}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadData(scenario, dataMode)}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-rr-border bg-rr-base px-3 py-2 text-[10px] font-bold text-rr-text2 transition-colors hover:border-rr-cyan/40 hover:text-rr-cyan disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {lastUpdated || "Refresh"}
          </button>

          <a
            href={buildDownloadUrl(scenario, dataMode)}
            download
            className="flex items-center gap-2 rounded-xl border border-rr-cyan/30 bg-rr-cyan/10 px-3 py-2 text-[10px] font-black text-rr-cyan transition-colors hover:bg-rr-cyan/20"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </a>
        </div>
      </header>

      <div className="space-y-2 border-b border-rr-border bg-rr-surface px-3 py-2 xl:hidden">
        <ScenarioBar value={scenario} onChange={setScenario} />
        <DataModeSwitch value={dataMode} onChange={setDataMode} />
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-[30%] flex-col overflow-hidden border-r border-rr-border bg-rr-base">
          <section className="shrink-0 border-b border-rr-border bg-gradient-to-b from-rr-surface to-rr-base p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-rr-muted">Intelligence Sidebar</div>
                <h1 className="mt-1 text-[18px] font-black leading-tight text-white">Supply Chain Risk</h1>
                <p className="mt-1 text-[10px] text-rr-text2">Weather shock → route delay → inventory pressure</p>
              </div>
              <div className="rounded-xl border border-rr-cyan/30 bg-rr-cyan/10 px-3 py-2 text-right">
                <div className="text-[22px] font-black leading-none text-rr-cyan">{loading ? "–" : highRiskCount}</div>
                <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.16em] text-rr-muted">High risk</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <MetricCard label="Routes" value={routes.length || "–"} sub="trade lanes" tone="cyan" />
              <MetricCard label="Delay" value={loading ? "–" : `${avgDelay.toFixed(1)}d`} sub="avg shock" tone={avgDelay > 5 ? "red" : "amber"} />
              <MetricCard label="Volume" value={routes.length ? formatUsdBn(totalVolume) : "–"} sub="annual" tone="green" />
            </div>
          </section>

          <nav className="grid shrink-0 grid-cols-4 border-b border-rr-border bg-rr-surface/60">
            {TABS.map((tab) => {
              const count = tab.id === "routes" ? routes.length : tab.id === "weather" ? filteredEvents.length : undefined;
              const active = sideTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSideTab(tab.id)}
                  className={`border-b-2 px-2 py-3 text-[9px] font-black uppercase tracking-[0.12em] transition-colors ${
                    active ? "border-rr-cyan text-rr-cyan" : "border-transparent text-rr-muted hover:text-rr-text2"
                  }`}
                >
                  {tab.label}{count !== undefined ? ` ${count}` : ""}
                </button>
              );
            })}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="rounded-xl border border-rr-border bg-rr-surface/60 p-5 text-center text-[10px] text-rr-muted rr-pulse">
                Loading risk model…
              </div>
            ) : error ? (
              <div className="rounded-xl border border-risk-critical/30 bg-risk-critical/10 p-4 text-risk-critical">
                <div className="flex items-center gap-2 text-[12px] font-black">
                  <AlertTriangle className="h-4 w-4" />
                  Backend unavailable
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-risk-critical/80">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadData(scenario, dataMode)}
                  className="mt-3 rounded-lg border border-risk-critical/40 px-3 py-1.5 text-[10px] font-bold hover:bg-risk-critical/10"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {sideTab === "routes" && routes.map((route) => (
                  <RouteCard key={route.id} route={route} isSelected={selectedRoute === route.id} onClick={() => handleSelectRoute(route.id)} />
                ))}
                {sideTab === "weather" && <WeatherEventList events={events} activeRouteId={selectedRoute} />}
                {sideTab === "insights" && (
                  <>
                    <InsightPanels content={sidebar} />
                    <div className="mt-3 rounded-xl border border-rr-border bg-rr-surface/80 p-3">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-rr-cyan">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Data Caveat
                      </div>
                      <p className="mt-2 text-[10px] leading-relaxed text-rr-text2">
                        Mode switch is manual. AUTO tries live providers and falls back safely; LIVE attempts API data first; SYNTHETIC forces stable demo data so weather never looks broken during presentation.
                      </p>
                    </div>
                  </>
                )}
                {sideTab === "sources" && <SourcePanel sources={sources} />}
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-rr-border bg-rr-surface/70 p-3">
            <a
              href={buildDownloadUrl(scenario, dataMode)}
              download
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-rr-cyan/30 bg-rr-cyan/10 py-2.5 text-[10px] font-black text-rr-cyan transition-colors hover:bg-rr-cyan/20"
            >
              <Download className="h-3.5 w-3.5" />
              Download Sample Data
            </a>
            <p className="mt-2 text-center text-[8px] text-rr-muted">Mock fallback is intentional and labelled for public demos.</p>
          </footer>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-rr-base">
          <div className="relative min-h-0 flex-1">
            <WorldMap
              routes={routes}
              events={events}
              seaCoords={seaCoords}
              selectedRoute={selectedRoute}
              onSelectRoute={handleSelectRoute}
            />

            <div className="pointer-events-none absolute right-4 top-4 z-10 grid w-[360px] grid-cols-3 gap-2">
              <MetricCard label="Events" value={events.length || "–"} sub="active shocks" tone="amber" />
              <MetricCard label="Sea paths" value={Object.keys(seaCoords).length || "–"} sub="backend fed" tone="cyan" />
              <MetricCard label="Mode" value={dataMode.toUpperCase()} sub={liveMode ? "live/hybrid" : "synthetic"} tone={liveMode ? "green" : "muted"} />
            </div>

            {!selected && !loading ? (
              <div className="pointer-events-none absolute bottom-4 right-4 z-10 rounded-xl border border-rr-border bg-rr-base/85 px-4 py-3 text-[10px] text-rr-muted backdrop-blur-xl">
                Select a route to open delay history and impact cascade.
              </div>
            ) : null}
          </div>

          {selected ? (
            <section className="grid h-[230px] shrink-0 grid-cols-2 overflow-hidden border-t border-rr-border bg-rr-surface/90">
              <div className="min-w-0 border-r border-rr-border p-4">
                <DelayChart routeId={selected.id} riskColor={selectedColor} dataMode={dataMode} />
              </div>
              <div className="min-w-0 p-4">
                <ImpactChain routeId={selected.id} scenario={scenario} dataMode={dataMode} />
              </div>
            </section>
          ) : (
            <section className="grid h-[230px] shrink-0 grid-cols-3 gap-3 overflow-hidden border-t border-rr-border bg-gradient-to-r from-rr-surface to-rr-base p-4">
              <div className="col-span-2 rounded-2xl border border-rr-border bg-rr-base/70 p-4">
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-rr-muted">Route intelligence standby</div>
                <div className="mt-2 text-[18px] font-black text-white">Select any route to zoom, open delay history, and inspect the impact cascade.</div>
                <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-rr-text2">The map now uses backend sea-route coordinates, dims unrelated lanes during focus, and keeps weather signals visible even when live APIs return calm conditions.</p>
              </div>
              <div className="rounded-2xl border border-rr-cyan/20 bg-rr-cyan/5 p-4">
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-rr-cyan">Current mode</div>
                <div className="mt-2 text-[24px] font-black text-white">{dataMode.toUpperCase()}</div>
                <p className="mt-2 text-[10px] leading-relaxed text-rr-text2">Use SYNTHETIC for a clean demo. Use LIVE to test APIs. Use AUTO for normal fallback behavior.</p>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
