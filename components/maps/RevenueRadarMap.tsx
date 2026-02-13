"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { RadarIndustryConfig } from "@/lib/radar-config";
import { getScoreColor } from "@/lib/radar-config";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RevenueRadarMapProps {
  radarConfig: RadarIndustryConfig;
  geoData?: {
    leads: any;
    permits: any;
    storms: any;
    neighborhoods?: any;
  };
  onLeadClick: (lead: any) => void;
  onMapMove?: (center: { lat: number; lng: number }) => void;
  flyTo?: { lat: number; lng: number } | null;
  radiusMiles: number;
  activeFilters: Record<string, boolean>;
  searchCenter: { lat: number; lng: number } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const DEFAULT_CENTER: [number, number] = [-77.4105, 39.4143]; // Frederick MD
const DEFAULT_ZOOM = 11.5;

// ─── Generate a smooth circle GeoJSON (for radius visualization) ─────────────

function makeRadiusCircle(
  centerLng: number,
  centerLat: number,
  radiusMiles: number,
  steps = 80
): GeoJSON.FeatureCollection {
  const R = 3958.8; // Earth radius in miles
  const latRad = centerLat * Math.PI / 180;
  const lngRad = centerLng * Math.PI / 180;
  const coords: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dx = radiusMiles * Math.cos(angle) / R;
    const dy = radiusMiles * Math.sin(angle) / R;
    const lat2 = latRad + dy;
    const lng2 = lngRad + dx / Math.cos(latRad);
    coords.push([lng2 * 180 / Math.PI, lat2 * 180 / Math.PI]);
  }

  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [coords] },
      properties: {},
    }],
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

const RevenueRadarMap: React.FC<RevenueRadarMapProps> = ({
  radarConfig,
  geoData,
  onLeadClick,
  onMapMove,
  flyTo,
  radiusMiles,
  activeFilters,
  searchCenter,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // ─── Initialize Map ──────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const initMap = async () => {
      let center: [number, number] = DEFAULT_CENTER;

      // Try user geolocation
      try {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
            });
          });
          center = [pos.coords.longitude, pos.coords.latitude];
        }
      } catch { /* fall back to default */ }

      const map = new maplibregl.Map({
        container: containerRef.current!,
        style: MAP_STYLE,
        center,
        zoom: DEFAULT_ZOOM,
        attributionControl: false,
        maxZoom: 18,
        minZoom: 5,
      });

      mapRef.current = map;

      map.addControl(
        new maplibregl.NavigationControl({ visualizePitch: false }),
        "bottom-right"
      );

      map.on("load", () => {
        const c = map.getCenter();
        if (onMapMove) onMapMove({ lat: c.lat, lng: c.lng });

        // ── Sources ──────────────────────────────────────────────
        map.addSource("search-radius", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        map.addSource("storms", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        map.addSource("permits", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        map.addSource("leads", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          cluster: true,
          clusterRadius: 52,
          clusterMaxZoom: 13,
        });

        map.addSource("neighborhoods", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        // ── Layers (bottom → top) ────────────────────────────────

        // Search radius ring
        map.addLayer({
          id: "search-radius-fill",
          type: "fill",
          source: "search-radius",
          paint: {
            "fill-color": "#ffffff",
            "fill-opacity": 0.04,
          },
        });
        map.addLayer({
          id: "search-radius-border",
          type: "line",
          source: "search-radius",
          paint: {
            "line-color": "#ffffff",
            "line-opacity": 0.15,
            "line-width": 1.5,
            "line-dasharray": [4, 3],
          },
        });

        // Neighborhood zones
        map.addLayer({
          id: "neighborhood-fill",
          type: "fill",
          source: "neighborhoods",
          paint: {
            "fill-color": "#6366F1",
            "fill-opacity": 0.08,
          },
        });
        map.addLayer({
          id: "neighborhood-border",
          type: "line",
          source: "neighborhoods",
          paint: {
            "line-color": "#6366F1",
            "line-opacity": 0.35,
            "line-width": 1.5,
            "line-dasharray": [3, 2],
          },
        });
        map.addLayer({
          id: "neighborhood-label",
          type: "symbol",
          source: "neighborhoods",
          layout: {
            "text-field": [
              "concat",
              ["get", "name"],
              " • ",
              ["to-string", ["get", "propertyCount"]],
              " props • avg ",
              ["to-string", ["get", "avgPropertyAge"]],
              "yr"
            ],
            "text-size": 11,
            "text-font": ["Open Sans Semibold"],
            "text-anchor": "center",
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#A5B4FC",
            "text-halo-color": "#0D1117",
            "text-halo-width": 1.5,
          },
        });

        // Storm zones
        map.addLayer({
          id: "storm-zones",
          type: "fill",
          source: "storms",
          paint: {
            "fill-color": "#FF3B3B",
            "fill-opacity": 0.12,
          },
        });
        map.addLayer({
          id: "storm-borders",
          type: "line",
          source: "storms",
          paint: {
            "line-color": "#FF3B3B",
            "line-width": 1.5,
            "line-opacity": 0.6,
          },
        });

        // Permit points
        map.addLayer({
          id: "permit-points",
          type: "circle",
          source: "permits",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3, 13, 5, 16, 7],
            "circle-color": "#3B82F6",
            "circle-opacity": 0.85,
            "circle-stroke-color": "#0B0F14",
            "circle-stroke-width": 1,
          },
        });

        // Lead clusters
        map.addLayer({
          id: "lead-clusters",
          type: "circle",
          source: "leads",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#111827",
            "circle-stroke-color": "#374151",
            "circle-stroke-width": 1,
            "circle-radius": ["step", ["get", "point_count"], 18, 50, 24, 150, 30],
            "circle-opacity": 0.92,
          },
        });

        map.addLayer({
          id: "lead-cluster-count",
          type: "symbol",
          source: "leads",
          filter: ["has", "point_count"],
          layout: {
            "text-field": "{point_count_abbreviated}",
            "text-size": 12,
            "text-font": ["Open Sans Bold"],
          },
          paint: { "text-color": "#D1D5DB" },
        });

        // Individual lead points
        map.addLayer({
          id: "lead-points",
          type: "circle",
          source: "leads",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 4, 13, 7, 16, 10],
            "circle-color": [
              "case",
              [">=", ["get", "score"], 8.5], "#35FF7A",
              [">=", ["get", "score"], 7.0], "#FFD84D",
              "#FF2D8A",
            ],
            "circle-opacity": 0.92,
            "circle-stroke-color": "#0B0F14",
            "circle-stroke-width": 1.2,
          },
        });

        // ── Interactions ─────────────────────────────────────────

        // Cluster click → zoom
        map.on("click", "lead-clusters", (e) => {
          const feat = e.features?.[0];
          if (!feat) return;
          const clusterId = feat.properties?.cluster_id;
          if (clusterId == null) return;
          const src = map.getSource("leads") as any;
          if (!src?.getClusterExpansionZoom) return;
          src.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
            if (err) return;
            const coords = (feat.geometry as any).coordinates;
            map.easeTo({ center: coords, zoom });
          });
        });

        // Lead click → popup + panel
        map.on("click", "lead-points", (e) => {
          const feat = e.features?.[0];
          if (!feat) return;
          const coords = (feat.geometry as any).coordinates as [number, number];
          const props = { ...feat.properties };

          // Parse JSON strings from GeoJSON properties
          if (typeof props.reasons === 'string') {
            try { props.reasons = JSON.parse(props.reasons); } catch { props.reasons = []; }
          }

          // Build popup
          const container = document.createElement("div");
          container.style.cssText = "min-width:180px;color:#E5E7EB;font-family:system-ui,sans-serif;";

          const scoreColor = getScoreColor(props.score || 0);

          container.innerHTML = `
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#F9FAFB;">${props.name || props.address || 'Lead'}</div>
            <div style="font-size:12px;color:#9CA3AF;margin-bottom:8px;">
              Score: <span style="color:${scoreColor};font-weight:600;">${props.score ?? '—'}</span>
              &nbsp;•&nbsp; ${props.type || ''}
            </div>
            <div style="display:flex;gap:6px;">
              <button id="popup-view" style="flex:1;padding:6px 10px;border-radius:8px;border:1px solid #374151;background:#111827;color:#E5E7EB;cursor:pointer;font-size:12px;font-weight:600;">Details</button>
              <button id="popup-create" style="flex:1;padding:6px 10px;border-radius:8px;border:none;background:#E91E8C;color:#fff;cursor:pointer;font-size:12px;font-weight:600;">Create Lead</button>
            </div>
          `;

          if (popupRef.current) popupRef.current.remove();

          const popup = new maplibregl.Popup({
            offset: 12,
            closeButton: true,
            maxWidth: "240px",
            className: "radar-popup",
          })
            .setLngLat(coords)
            .setDOMContent(container)
            .addTo(map);

          popupRef.current = popup;

          // Attach handlers after DOM is ready
          setTimeout(() => {
            container.querySelector("#popup-view")?.addEventListener("click", () => {
              onLeadClick(props);
              popup.remove();
            });
            container.querySelector("#popup-create")?.addEventListener("click", () => {
              onLeadClick(props);
              popup.remove();
            });
          }, 0);
        });

        // Storm click
        map.on("click", "storm-zones", (e) => {
          const feat = e.features?.[0];
          if (!feat) return;
          const container = document.createElement("div");
          container.style.cssText = "color:#E5E7EB;font-family:system-ui,sans-serif;";
          container.innerHTML = `
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#FF3B3B;">Storm Zone</div>
            <div style="font-size:12px;color:#9CA3AF;">${feat.properties?.label || 'Severe weather event'}</div>
          `;
          new maplibregl.Popup({ offset: 10, className: "radar-popup" })
            .setLngLat(e.lngLat)
            .setDOMContent(container)
            .addTo(map);
        });

        // Permit click
        map.on("click", "permit-points", (e) => {
          const feat = e.features?.[0];
          if (!feat) return;
          const coords = (feat.geometry as any).coordinates as [number, number];
          const container = document.createElement("div");
          container.style.cssText = "color:#E5E7EB;font-family:system-ui,sans-serif;";
          container.innerHTML = `
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#3B82F6;">${feat.properties?.permitType || 'Permit'}</div>
            <div style="font-size:12px;color:#9CA3AF;">${feat.properties?.address || ''} • ${feat.properties?.date || ''}</div>
          `;
          new maplibregl.Popup({ offset: 10, className: "radar-popup" })
            .setLngLat(coords)
            .setDOMContent(container)
            .addTo(map);
        });

        // Neighborhood zone click
        map.on("click", "neighborhood-fill", (e) => {
          const feat = e.features?.[0];
          if (!feat) return;
          const p = feat.properties;
          const container = document.createElement("div");
          container.style.cssText = "color:#E5E7EB;font-family:system-ui,sans-serif;min-width:200px;";
          const incomeRow = p.medianIncome ? `<div>Median income: <b style="color:#E5E7EB;">${p.medianIncome}</b></div>` : '';
          const ownerRow = p.ownerOccupiedPct ? `<div>Owner-occupied: <b style="color:#E5E7EB;">${p.ownerOccupiedPct}%</b></div>` : '';
          container.innerHTML = `
            <div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#A5B4FC;">${p.name || 'Neighborhood'}</div>
            <div style="font-size:12px;color:#9CA3AF;line-height:1.6;">
              <div><b style="color:#E5E7EB;">${p.propertyCount}</b> properties</div>
              <div>Avg home age: <b style="color:#E5E7EB;">~${p.avgPropertyAge} years</b></div>
              ${incomeRow}
              ${ownerRow}
              <div>Storm exposure: <b style="color:#E5E7EB;">${p.stormExposurePct}%</b></div>
              <div>Permit signals: <b style="color:#E5E7EB;">${p.permitActivityPct}%</b></div>
              <div>Avg score: <b style="color:${p.avgScore >= 8.5 ? '#35FF7A' : p.avgScore >= 7 ? '#FFD84D' : '#FF2D8A'};">${p.avgScore}</b></div>
            </div>
          `;
          new maplibregl.Popup({ offset: 10, className: "radar-popup" })
            .setLngLat(e.lngLat)
            .setDOMContent(container)
            .addTo(map);
        });

        // Cursors
        const pointerLayers = ["lead-points", "lead-clusters", "permit-points", "storm-zones", "neighborhood-fill"];
        for (const layer of pointerLayers) {
          map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
        }

        // Move handler
        map.on("moveend", () => {
          const c = map.getCenter();
          if (onMapMove) onMapMove({ lat: c.lat, lng: c.lng });
        });

        setMapReady(true);
      });
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Update data sources when geoData changes ───────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    try {
      const sLeads = map.getSource("leads") as maplibregl.GeoJSONSource | undefined;
      if (sLeads) sLeads.setData(geoData?.leads || { type: "FeatureCollection", features: [] });

      const sPermits = map.getSource("permits") as maplibregl.GeoJSONSource | undefined;
      if (sPermits) sPermits.setData(geoData?.permits || { type: "FeatureCollection", features: [] });

      const sStorms = map.getSource("storms") as maplibregl.GeoJSONSource | undefined;
      if (sStorms) sStorms.setData(geoData?.storms || { type: "FeatureCollection", features: [] });

      const sNeighborhoods = map.getSource("neighborhoods") as maplibregl.GeoJSONSource | undefined;
      if (sNeighborhoods) sNeighborhoods.setData(geoData?.neighborhoods || { type: "FeatureCollection", features: [] });
    } catch { /* sources not ready */ }
  }, [geoData, mapReady]);

  // ─── Update search radius visualization ─────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !searchCenter) return;

    try {
      const src = map.getSource("search-radius") as maplibregl.GeoJSONSource | undefined;
      if (src) {
        src.setData(makeRadiusCircle(searchCenter.lng, searchCenter.lat, radiusMiles));
      }
    } catch { /* source not ready */ }
  }, [searchCenter, radiusMiles, mapReady]);

  // ─── Toggle layer visibility based on filters ──────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Storm layers
    const showStorm = activeFilters.storm !== false;
    if (map.getLayer("storm-zones")) {
      map.setLayoutProperty("storm-zones", "visibility", showStorm ? "visible" : "none");
      map.setLayoutProperty("storm-borders", "visibility", showStorm ? "visible" : "none");
    }

    // Permit layers
    const showPermit = activeFilters.permit !== false;
    if (map.getLayer("permit-points")) {
      map.setLayoutProperty("permit-points", "visibility", showPermit ? "visible" : "none");
    }
  }, [activeFilters, mapReady]);

  // ─── Fly to location ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    map.flyTo({
      center: [flyTo.lng, flyTo.lat],
      speed: 0.8,
      essential: true,
    });
  }, [flyTo]);

  // ─── Fit bounds to radius on search ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !searchCenter) return;

    // Fit to show the radius nicely
    const R = 3958.8;
    const latRad = searchCenter.lat * Math.PI / 180;
    const dLat = radiusMiles / R * (180 / Math.PI);
    const dLng = radiusMiles / (R * Math.cos(latRad)) * (180 / Math.PI);

    const bounds = new maplibregl.LngLatBounds(
      [searchCenter.lng - dLng, searchCenter.lat - dLat],
      [searchCenter.lng + dLng, searchCenter.lat + dLat]
    );

    map.fitBounds(bounds, { padding: 60, duration: 700 });
  }, [searchCenter, radiusMiles, mapReady]);

  return (
    <>
      {/* Custom popup styles */}
      <style jsx global>{`
        .radar-popup .maplibregl-popup-content {
          background: #111827;
          border: 1px solid #1F2937;
          border-radius: 12px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.5);
          padding: 10px 12px;
        }
        .radar-popup .maplibregl-popup-tip {
          border-top-color: #111827 !important;
          border-bottom-color: #111827 !important;
        }
        .radar-popup .maplibregl-popup-close-button {
          color: #6B7280;
          font-size: 16px;
          padding: 2px 6px;
        }
        .radar-popup .maplibregl-popup-close-button:hover {
          color: #D1D5DB;
          background: transparent;
        }
        .maplibregl-ctrl-group {
          background: #111827 !important;
          border: 1px solid #1F2937 !important;
          border-radius: 8px !important;
          overflow: hidden;
        }
        .maplibregl-ctrl-group button {
          filter: invert(0.85);
        }
        .maplibregl-ctrl-group button + button {
          border-top: 1px solid #1F2937 !important;
        }
      `}</style>
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ borderRadius: 0 }}
      />
    </>
  );
};

export default RevenueRadarMap;
