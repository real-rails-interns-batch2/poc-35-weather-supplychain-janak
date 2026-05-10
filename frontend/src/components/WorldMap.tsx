"use client";

import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import { Maximize2, RotateCcw, Route as RouteIcon } from "lucide-react";
import { RISK_BG, RISK_COLOR, SEV_COLOR, cn } from "@/lib/utils";
import type { RiskResult, WeatherEvent } from "@/types";

interface Props {
  routes: RiskResult[];
  events: WeatherEvent[];
  seaCoords: Record<string, [number, number][]>;
  selectedRoute: string | null;
  onSelectRoute: (id: string | null) => void;
}

const WORLD_CENTER: LatLngExpression = [18, 18];
const WORLD_ZOOM = 2;

function toLatLng(coords: [number, number][]): LatLngExpression[] {
  return coords.map(([lng, lat]) => [lat, lng]);
}

function splitAtDateLine(coords: [number, number][]): LatLngExpression[][] {
  if (coords.length < 2) return [toLatLng(coords)];

  const segments: [number, number][][] = [[coords[0]]];

  for (let i = 1; i < coords.length; i += 1) {
    const previous = coords[i - 1];
    const current = coords[i];
    const crossesDateLine = Math.abs(current[0] - previous[0]) > 180;

    if (crossesDateLine) segments.push([]);
    segments[segments.length - 1].push(current);
  }

  return segments.filter((segment) => segment.length > 1).map(toLatLng);
}

function getRouteCoords(route: RiskResult, seaCoords: Record<string, [number, number][]>): [number, number][] {
  return seaCoords[route.id] ?? [
    [route.origin.lng, route.origin.lat],
    [route.destination.lng, route.destination.lat],
  ];
}

function buildBounds(coords: [number, number][]): LatLngBoundsExpression | null {
  const points = toLatLng(coords);
  if (points.length < 2) return null;
  const lats = coords.map(([, lat]) => lat);
  const lngs = coords.map(([lng]) => lng);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ] as LatLngBoundsExpression;
}

function CameraController({ selectedRoute, routes, seaCoords }: Pick<Props, "selectedRoute" | "routes" | "seaCoords">) {
  const map = useMap();

  useEffect(() => {
    if (!selectedRoute) {
      map.flyTo(WORLD_CENTER, WORLD_ZOOM, { duration: 0.65 });
      return;
    }

    const selected = routes.find((route) => route.id === selectedRoute);
    if (!selected) return;

    const bounds = buildBounds(getRouteCoords(selected, seaCoords));
    if (!bounds) return;

    map.flyToBounds(bounds, {
      paddingTopLeft: [90, 90],
      paddingBottomRight: [90, 90],
      maxZoom: 4,
      duration: 0.85,
    });
  }, [map, routes, seaCoords, selectedRoute]);

  return null;
}

export default function WorldMap({ routes, events, seaCoords, selectedRoute, onSelectRoute }: Props) {
  const [focusOnly, setFocusOnly] = useState(true);
  const selected = routes.find((route) => route.id === selectedRoute) ?? null;

  const visibleEvents = useMemo(() => {
    if (!selectedRoute || !focusOnly) return events;
    return events.filter((event) => event.affected_routes.includes(selectedRoute));
  }, [events, focusOnly, selectedRoute]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-rr-base">
      <MapContainer
        center={WORLD_CENTER}
        zoom={WORLD_ZOOM}
        minZoom={2}
        maxZoom={6}
        scrollWheelZoom
        worldCopyJump
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full rr-leaflet-map"
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <CameraController selectedRoute={selectedRoute} routes={routes} seaCoords={seaCoords} />

        {routes.map((route) => {
          const active = route.id === selectedRoute;
          const dimmed = Boolean(selectedRoute && !active && focusOnly);
          const color = RISK_COLOR[route.risk_level] ?? "#38BDF8";
          const coords = getRouteCoords(route, seaCoords);
          const segments = splitAtDateLine(coords);

          return segments.map((segment, index) => (
            <Polyline
              key={`${route.id}-${index}-${active ? "active" : "idle"}`}
              positions={segment}
              pathOptions={{
                color,
                weight: active ? 4 : dimmed ? 1 : 2,
                opacity: active ? 0.95 : dimmed ? 0.15 : 0.48,
                lineCap: "round",
                lineJoin: "round",
              }}
              eventHandlers={{ click: () => onSelectRoute(route.id) }}
            >
              <Tooltip sticky className="rr-map-tooltip">
                <div className="space-y-1">
                  <div className="font-bold text-white">{route.id} · {route.name}</div>
                  <div>{route.origin.city} → {route.destination.city}</div>
                  <div style={{ color }}>Risk: {route.risk_level} · {route.risk_score}/100</div>
                  <div>Delay: +{route.estimated_delay_days}d</div>
                </div>
              </Tooltip>
            </Polyline>
          ));
        })}

        {routes.flatMap((route) => {
          const active = route.id === selectedRoute;
          const dimmed = Boolean(selectedRoute && !active && focusOnly);
          const color = RISK_COLOR[route.risk_level] ?? "#38BDF8";
          const ports = [
            { role: "Origin", port: route.origin },
            { role: "Destination", port: route.destination },
          ];

          return ports.map(({ role, port }) => (
            <CircleMarker
              key={`${route.id}-${role}`}
              center={[port.lat, port.lng]}
              radius={active ? 7 : dimmed ? 3 : 5}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: active ? 0.95 : dimmed ? 0.25 : 0.75,
                opacity: active ? 1 : dimmed ? 0.3 : 0.75,
                weight: active ? 2 : 1,
              }}
              eventHandlers={{ click: () => onSelectRoute(route.id) }}
            >
              <Popup className="rr-map-popup">
                <div className="min-w-[180px] space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-rr-muted">{role}</div>
                  <div className="text-sm font-black text-white">{port.city}</div>
                  <div className="text-[11px] text-rr-text2">{route.name}</div>
                </div>
              </Popup>
            </CircleMarker>
          ));
        })}

        {visibleEvents.map((event) => {
          const color = SEV_COLOR[event.severity] ?? "#9CA3AF";
          const activeForRoute = selectedRoute ? event.affected_routes.includes(selectedRoute) : true;

          return (
            <CircleMarker
              key={event.id}
              center={[event.lat, event.lng]}
              radius={event.severity === "SEVERE" ? 9 : 7}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: activeForRoute ? 0.8 : 0.28,
                opacity: activeForRoute ? 0.95 : 0.35,
                weight: 2,
              }}
            >
              <Popup className="rr-map-popup">
                <div className="min-w-[210px] space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color }}>{event.severity}</div>
                  <div className="text-sm font-black text-white">{event.type}</div>
                  <div className="text-[11px] text-rr-text2">{event.region}</div>
                  <div className="text-[10px] text-rr-muted">Affected: {event.affected_routes.join(", ")}</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute left-4 top-4 z-[500] flex max-w-[520px] flex-wrap items-center gap-2">
        <div className="rr-glass rounded-2xl px-4 py-3 shadow-2xl">
          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-rr-muted">Flat Map View</div>
          <div className="mt-0.5 flex items-center gap-2 text-[13px] font-black text-white">
            <RouteIcon className="h-3.5 w-3.5 text-rr-cyan" />
            Maritime Route Network
          </div>
        </div>

        {selected ? (
          <div className="rr-glass rounded-2xl border-rr-cyan/30 px-4 py-3 shadow-2xl">
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-rr-cyan">Focused lane</div>
            <div className="mt-0.5 max-w-[300px] truncate text-[13px] font-black text-white">{selected.name}</div>
          </div>
        ) : null}
      </div>

      <div className="absolute bottom-4 right-4 z-[500] flex items-center gap-2 rounded-2xl border border-rr-border bg-rr-base/90 p-2 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setFocusOnly((current) => !current)}
          className="flex items-center gap-1.5 rounded-xl border border-rr-border bg-rr-surface px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-rr-text2 transition-colors hover:border-rr-cyan/40 hover:text-rr-cyan"
        >
          <Maximize2 className="h-3 w-3" />
          {focusOnly ? "Focus" : "All"}
        </button>

        <button
          type="button"
          onClick={() => onSelectRoute(null)}
          className="flex items-center gap-1.5 rounded-xl border border-rr-border bg-rr-surface px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-rr-muted transition-colors hover:border-rr-border2 hover:text-rr-text2"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] flex flex-wrap items-center gap-2 rounded-2xl border border-rr-border bg-rr-base/90 px-3 py-2 shadow-2xl backdrop-blur-xl">
        {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((level) => (
          <div key={level} className="flex items-center gap-1.5 rounded-lg px-1.5 py-1" style={{ background: RISK_BG[level] }}>
            <div className="h-2 w-2 rounded-full" style={{ background: RISK_COLOR[level] }} />
            <span className="text-[8px] font-black uppercase tracking-[0.14em]" style={{ color: RISK_COLOR[level] }}>{level}</span>
          </div>
        ))}
        <div className="mx-1 h-4 w-px bg-rr-border" />
        <div className="flex items-center gap-1.5 rounded-lg bg-risk-medium/10 px-1.5 py-1">
          <div className="h-2 w-2 rounded-full bg-risk-medium rr-pulse" />
          <span className="text-[8px] font-black uppercase tracking-[0.14em] text-risk-medium">Weather</span>
        </div>
      </div>
    </div>
  );
}
