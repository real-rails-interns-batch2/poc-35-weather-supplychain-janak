export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type Severity = "SEVERE" | "MODERATE" | "LOW";
export type Scenario = "optimistic" | "current" | "pessimistic";
export type DataSource = "SYNTHETIC" | "LIVE" | "LIVE_OWM" | "LIVE_COMTRADE" | "HYBRID_OWM_SYNTHETIC" | string;
export type DataMode = "auto" | "live" | "synthetic";

export interface Port {
  lat: number;
  lng: number;
  city: string;
}

export interface TradeRoute {
  id: string;
  name: string;
  origin: Port;
  destination: Port;
  commodities: string[];
  baseline_days: number;
  annual_volume_bn: number;
  concentration_risk: RiskLevel;
  volume_source?: string;
}

export interface WeatherEvent {
  id: string;
  type: string;
  severity: Severity;
  region: string;
  affected_routes: string[];
  lat: number;
  lng: number;
  start_date: string;
  estimated_duration_days: number;
  delay_multiplier: number;
  noaa_event_id: string;
  event_source?: DataSource;
}

export interface RiskResult extends TradeRoute {
  active_weather_events: WeatherEvent[];
  combined_delay_multiplier: number;
  estimated_delay_days: number;
  estimated_total_days: number;
  risk_score: number;
  risk_level: RiskLevel;
  scenario: Scenario;
  data_source: DataSource;
  last_updated: string;
}

export interface DelayPoint {
  date: string;
  delay_days: number;
  source: string;
}

export interface ImpactNode {
  id: string;
  label: string;
  type: "trigger" | "impact" | "consequence";
  value: number;
}

export interface ImpactEdge {
  from: string;
  to: string;
}

export interface ImpactChain {
  route_id: string;
  scenario: Scenario;
  nodes: ImpactNode[];
  edges: ImpactEdge[];
  data_source: DataSource;
  risk_score: number;
  risk_level: RiskLevel;
}

export interface SourceInfo {
  name: string;
  url: string | null;
  status: "LIVE" | "MOCK" | "ACTIVE";
  confidence: number;
  last_refresh: string | null;
  env_var: string | null;
  note: string;
}

export interface SidebarContent {
  why_this_matters: {
    headline: string;
    body: string;
  };
  who_controls: {
    headline: string;
    body: string;
  };
}

export interface SeaRoute {
  id: string;
  coords: [number, number][];
}
