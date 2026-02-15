"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Search, Crosshair, ChevronDown, Loader2, Radar, LayoutList,
  Settings2, Info
} from "lucide-react";
import RevenueRadarMap from "@/components/maps/RevenueRadarMap";
import LeadSidePanel from "@/components/prospector/LeadSidePanel";
import {
  getRadarConfig,
  type RadarIndustryType,
  type RadarIndustryConfig,
  getScoreColor,
} from "@/lib/radar-config";
import { TRADE_PROFILES, type ResidentialTrade } from "@/lib/radar/trade-profiles";
import { PHOTO_NICHE_PROFILES, type PhotographerNiche } from "@/lib/radar/photo-niches";
import { useIndustry } from "@/lib/contexts/IndustryContext";
import { getEffectiveProspectorConfig, type ProspectorConfig } from "@/lib/verticals";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapCrmToRadarIndustry(crmIndustry: string): RadarIndustryType {
  // Legacy mapping for orgs without prospector_config.
  // New orgs use getEffectiveProspectorConfig() instead.
  const map: Record<string, RadarIndustryType> = {
    default: "b2b_service",
    photographer: "photographer",
    service_professional: "b2b_service",
    roofing: "residential_service",
    solar: "residential_service",
    hvac: "residential_service",
    remodeling: "residential_service",
    plumbing: "residential_service",
    general_contractor: "residential_service",
    barbershop: "b2b_service",
  };
  return map[crmIndustry] || "residential_service";
}

// ─── Trade Selector (Residential sub-type) ──────────────────────────────────

function TradeSelector({
  value,
  onChange,
}: {
  value: ResidentialTrade;
  onChange: (v: ResidentialTrade) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trades: ResidentialTrade[] = [
    "general", "roofing", "hvac", "remodeling", "solar", "siding_windows", "plumbing_electrical",
  ];

  const current = TRADE_PROFILES[value];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
          bg-primary-500/10 text-primary-400 border border-primary-500/30 hover:bg-primary-500/15
          transition-all"
      >
        <span>{current?.label || "General"}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 min-w-[200px] py-1 rounded-xl
            bg-gray-900/95 border border-gray-700/50 backdrop-blur-lg shadow-2xl"
        >
          {trades.map((key) => {
            const tp = TRADE_PROFILES[key];
            return (
              <button
                key={key}
                onClick={() => { onChange(key); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm flex flex-col gap-0.5 transition-colors ${
                  value === key
                    ? "bg-primary-500/10 text-primary-400"
                    : "text-gray-300 hover:bg-gray-800/70"
                }`}
              >
                <span className="font-medium">{tp.label}</span>
                <span className="text-[11px] text-gray-500">{tp.description}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Niche Selector (Photographer sub-type) ────────────────────────────────

function NicheSelector({
  value,
  onChange,
}: {
  value: PhotographerNiche;
  onChange: (v: PhotographerNiche) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const niches: PhotographerNiche[] = [
    "general_photo", "event_wedding", "portrait_lifestyle", "car_automotive",
    "street_urban", "content_creator", "real_estate",
  ];

  const current = PHOTO_NICHE_PROFILES[value];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
          bg-pink-500/10 text-pink-400 border border-pink-500/30 hover:bg-pink-500/15
          transition-all"
      >
        <span>{current?.label || "General"}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 min-w-[220px] py-1 rounded-xl
            bg-gray-900/95 border border-gray-700/50 backdrop-blur-lg shadow-2xl"
        >
          {niches.map((key) => {
            const np = PHOTO_NICHE_PROFILES[key];
            return (
              <button
                key={key}
                onClick={() => { onChange(key); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm flex flex-col gap-0.5 transition-colors ${
                  value === key
                    ? "bg-pink-500/10 text-pink-400"
                    : "text-gray-300 hover:bg-gray-800/70"
                }`}
              >
                <span className="font-medium">{np.label}</span>
                <span className="text-[11px] text-gray-500">{np.description}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function ProspectorPage() {
  const { industryType: crmIndustry } = useIndustry();

  // State
  // Resolve initial radar mode from vertical config
  const initialRadarMode = mapCrmToRadarIndustry(crmIndustry) as RadarIndustryType;
  // Map vertical ID to a sensible default trade
  const verticalTradeMap: Record<string, ResidentialTrade> = {
    roofing: 'roofing', solar: 'solar', hvac: 'hvac',
    remodeling: 'remodeling', plumbing: 'plumbing_electrical',
    general_contractor: 'general',
  };
  const initialTrade = verticalTradeMap[crmIndustry] || 'general';

  const [radarIndustry, setRadarIndustry] = useState<RadarIndustryType>(initialRadarMode);
  const [radarConfig, setRadarConfig] = useState<RadarIndustryConfig>(
    getRadarConfig(initialRadarMode)
  );
  const [selectedTrade, setSelectedTrade] = useState<ResidentialTrade>(initialTrade);
  const [selectedNiche, setSelectedNiche] = useState<PhotographerNiche>("general_photo");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [radius, setRadius] = useState(10);
  const [filters, setFilters] = useState<Record<string, boolean>>({});
  const [geoData, setGeoData] = useState<any>({ leads: null, permits: null, storms: null, neighborhoods: null });
  const [loading, setLoading] = useState(false);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [mapMoved, setMapMoved] = useState(false);
  const [resultCount, setResultCount] = useState(0);
  const [showLeadList, setShowLeadList] = useState(false);

  // Remove parent main padding so map goes edge-to-edge
  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    main.style.overflow = 'hidden';
    main.style.padding = '0';
    return () => {
      main.style.overflow = '';
      main.style.padding = '';
    };
  }, []);

  // Update config when industry changes
  useEffect(() => {
    const config = getRadarConfig(radarIndustry);
    setRadarConfig(config);

    // Reset filters to defaults for this industry
    const defaultFilters: Record<string, boolean> = {};
    config.signals.forEach((s) => {
      defaultFilters[s.id] = s.defaultOn;
    });
    setFilters(defaultFilters);

    // Clamp radius
    setRadius((prev) => Math.min(prev, config.maxRadiusMiles));

    // Clear existing data
    setGeoData({ leads: null, permits: null, storms: null, neighborhoods: null });
    setHasSearched(false);
    setSelectedLead(null);
  }, [radarIndustry]);

  // Search function
  const runSearch = useCallback(
    async (center: { lat: number; lng: number } | null = null) => {
      setLoading(true);

      let lat = center?.lat ?? mapCenter?.lat ?? 39.4143;
      let lng = center?.lng ?? mapCenter?.lng ?? -77.4105;

      // Try geolocation if no center
      if (!center && !mapCenter && typeof navigator !== "undefined" && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
            });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch { /* use defaults */ }
      }

      try {
        const params = new URLSearchParams({
          lat: lat.toString(),
          lng: lng.toString(),
          radius: radius.toString(),
          industry: radarIndustry,
          trade: radarIndustry === "photographer" ? selectedNiche : selectedTrade,
          filters: JSON.stringify(filters),
        });

        const res = await fetch(`/api/revenue-radar/search?${params}`);
        if (res.ok) {
          const data = await res.json();
          setGeoData({
            leads: data.leads,
            permits: data.permits,
            storms: data.storms,
            neighborhoods: data.neighborhoods || null,
          });
          setSearchCenter({ lat, lng });
          setResultCount(data.meta?.resultCount || data.leads?.features?.length || 0);
          setHasSearched(true);
          setMapMoved(false);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    },
    [radius, radarIndustry, selectedTrade, selectedNiche, filters, mapCenter]
  );

  // Handle map movement
  const handleMapMove = useCallback(
    (center: { lat: number; lng: number }) => {
      setMapCenter(center);
      if (hasSearched && searchCenter) {
        const dist = Math.sqrt(
          (center.lat - searchCenter.lat) ** 2 + (center.lng - searchCenter.lng) ** 2
        );
        setMapMoved(dist > 0.01);
      }
    },
    [hasSearched, searchCenter]
  );

  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) return;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
        });
      });
      const center = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setFlyTo(center);
      runSearch(center);
    } catch { /* ignore */ }
  };

  const handleSearchThisArea = () => {
    if (mapCenter) runSearch(mapCenter);
  };

  const handleFlyToLead = (lead: any) => {
    if (lead.lat && lead.lng) {
      setFlyTo({ lat: lead.lat, lng: lead.lng });
    } else {
      // Try to extract from the stored GeoJSON
      const feature = geoData?.leads?.features?.find(
        (f: any) => f.properties?.id === lead.id
      );
      if (feature) {
        const [lng, lat] = feature.geometry.coordinates;
        setFlyTo({ lat, lng });
      }
    }
  };

  const toggleFilter = (id: string) => {
    setFilters((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Lead list from geoData
  const leadList = geoData?.leads?.features?.map((f: any) => f.properties) || [];

  return (
    <div className="flex flex-col w-full h-full overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>
      <div className="flex-1 flex w-full h-full relative">
        {/* ── Map Area ─────────────────────────────────────────── */}
        <div className="relative flex-1 h-full">
          {/* ── Top Control Bar ───────────────────────────────── */}
          <div className="absolute left-2 right-2 sm:left-3 sm:right-3 top-2 sm:top-3 z-40 flex flex-col gap-2">
            {/* Row 1: Industry + Sub-type + Search */}
            <div
              className="relative z-10 flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-2xl backdrop-blur-md border shadow-lg"
              style={{
                background: "rgba(13, 17, 23, 0.82)",
                borderColor: "rgba(55, 65, 81, 0.4)",
              }}
            >
              {/* Radar mode label (configured in Settings > Organization > Prospector) */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800/70 text-gray-300 border border-gray-700/50">
                <Radar size={13} />
                <span>{radarConfig?.label || "Prospector"}</span>
              </div>

              {radarIndustry === "residential_service" && (
                <TradeSelector value={selectedTrade} onChange={setSelectedTrade} />
              )}

              {radarIndustry === "photographer" && (
                <NicheSelector value={selectedNiche} onChange={setSelectedNiche} />
              )}

              {/* Divider — desktop only */}
              <div className="w-px h-6 bg-gray-700/50 hidden sm:block" />

              {/* Radius — hidden on mobile, shown in row 2 */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[11px] text-gray-500 uppercase tracking-wider">Radius</span>
                <input
                  type="range"
                  min={5}
                  max={radarConfig.maxRadiusMiles}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-24 h-1.5 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #E91E8C ${
                      ((radius - 5) / (radarConfig.maxRadiusMiles - 5)) * 100
                    }%, #374151 0%)`,
                  }}
                />
                <span className="text-xs text-gray-300 font-medium tabular-nums w-10 text-right">
                  {radius} mi
                </span>
              </div>

              <div className="w-px h-6 bg-gray-700/50 hidden sm:block" />

              {/* Filter Chips — hidden on mobile, shown in row 2 */}
              <div className="hidden sm:flex items-center gap-1.5">
                {radarConfig.signals.map((signal) => (
                  <button
                    key={signal.id}
                    onClick={() => toggleFilter(signal.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      filters[signal.id]
                        ? "text-white border"
                        : "text-gray-500 border border-transparent bg-gray-800/40"
                    }`}
                    style={
                      filters[signal.id]
                        ? {
                            background: `${signal.color}15`,
                            borderColor: `${signal.color}40`,
                            color: signal.color,
                          }
                        : undefined
                    }
                    title={signal.description}
                  >
                    {signal.label}
                  </button>
                ))}
              </div>

              <div className="w-px h-6 bg-gray-700/50 hidden sm:block" />

              {/* Spacer pushes search button right on mobile */}
              <div className="flex-1 sm:hidden" />

              {/* Search Button */}
              <button
                onClick={() => runSearch(mapCenter)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold
                  text-white transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-50 shrink-0"
                style={{ background: "linear-gradient(135deg, #E91E8C, #C41E7A)" }}
              >
                {loading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Search size={13} />
                )}
                <span className="hidden sm:inline">{loading ? "Searching..." : "Search"}</span>
              </button>
            </div>

            {/* Row 2: Radius + Filters — mobile only */}
            <div
              className="flex sm:hidden items-center gap-2 px-2.5 py-1.5 rounded-2xl backdrop-blur-md border shadow-lg overflow-x-auto scrollbar-none"
              style={{
                background: "rgba(13, 17, 23, 0.82)",
                borderColor: "rgba(55, 65, 81, 0.4)",
              }}
            >
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-gray-500 uppercase">Radius</span>
                <input
                  type="range"
                  min={5}
                  max={radarConfig.maxRadiusMiles}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-16 h-1.5 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #E91E8C ${
                      ((radius - 5) / (radarConfig.maxRadiusMiles - 5)) * 100
                    }%, #374151 0%)`,
                  }}
                />
                <span className="text-[11px] text-gray-300 font-medium tabular-nums">
                  {radius}mi
                </span>
              </div>

              <div className="w-px h-5 bg-gray-700/50 shrink-0" />

              <div className="flex items-center gap-1 shrink-0">
                {radarConfig.signals.map((signal) => (
                  <button
                    key={signal.id}
                    onClick={() => toggleFilter(signal.id)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
                      filters[signal.id]
                        ? "text-white border"
                        : "text-gray-500 border border-transparent bg-gray-800/40"
                    }`}
                    style={
                      filters[signal.id]
                        ? {
                            background: `${signal.color}15`,
                            borderColor: `${signal.color}40`,
                            color: signal.color,
                          }
                        : undefined
                    }
                  >
                    {signal.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── "Search This Area" floating button ────────────── */}
          {mapMoved && hasSearched && (
            <div className="absolute left-1/2 top-[110px] sm:top-[72px] z-40 -translate-x-1/2">
              <button
                onClick={handleSearchThisArea}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold 
                  text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.97]
                  animate-in fade-in slide-in-from-top-2"
                style={{
                  background: "linear-gradient(135deg, #E91E8C, #C41E7A)",
                  boxShadow: "0 8px 24px rgba(233,30,140,0.3)",
                }}
              >
                <Search size={13} />
                Search this area
              </button>
            </div>
          )}

          {/* ── Legend (bottom-left) ───────────────────────────── */}
          <div
            className="absolute left-3 bottom-3 z-30 px-3 py-2.5 rounded-xl backdrop-blur-md border"
            style={{
              background: "rgba(13, 17, 23, 0.82)",
              borderColor: "rgba(55, 65, 81, 0.4)",
            }}
          >
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">
              {radarConfig.label}
            </div>
            <div className="space-y-1">
              {/* Industry-specific signal legends */}
              {radarConfig.signals.map((signal) => (
                <div key={signal.id} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: signal.color, opacity: 0.9 }}
                  />
                  <span className="text-[11px] text-gray-400">{signal.label}</span>
                </div>
              ))}
              {/* Score legends */}
              <div className="border-t border-gray-800/50 mt-1.5 pt-1.5" />
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#35FF7A]" />
                <span className="text-[11px] text-gray-400">High (8.5+)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFD84D]" />
                <span className="text-[11px] text-gray-400">Medium (7–8.5)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF2D8A]" />
                <span className="text-[11px] text-gray-400">Low (&lt;7)</span>
              </div>
            </div>
          </div>

          {/* ── Meta info (bottom-right, above nav controls) ──── */}
          {hasSearched && (
            <div
              className="absolute right-3 bottom-28 z-30 px-3 py-2 rounded-xl backdrop-blur-md border"
              style={{
                background: "rgba(13, 17, 23, 0.82)",
                borderColor: "rgba(55, 65, 81, 0.4)",
              }}
            >
              <div className="text-[11px] text-gray-400">
                <span className="font-semibold text-gray-300">{resultCount}</span>{" "}
                {radarConfig.leadNounPlural} found
              </div>
              <div className="text-[10px] text-gray-600 mt-0.5">
                {radius} mi radius • {radarConfig.maxResults} max
              </div>
            </div>
          )}

          {/* ── My Location Button ────────────────────────────── */}
          <div className="absolute right-3 bottom-[180px] z-30">
            <button
              onClick={handleUseMyLocation}
              title="Use my location"
              className="w-10 h-10 rounded-lg flex items-center justify-center backdrop-blur-md border transition-all hover:bg-gray-800/50"
              style={{
                background: "rgba(13, 17, 23, 0.82)",
                borderColor: "rgba(55, 65, 81, 0.4)",
              }}
            >
              <Crosshair size={16} className="text-gray-400" />
            </button>
          </div>

          {/* ── Lead List Toggle ───────────────────────────────── */}
          {hasSearched && leadList.length > 0 && (
            <div className="absolute left-3 bottom-[180px] z-30">
              <button
                onClick={() => setShowLeadList(!showLeadList)}
                title="Toggle lead list"
                className="w-10 h-10 rounded-lg flex items-center justify-center backdrop-blur-md border transition-all hover:bg-gray-800/50"
                style={{
                  background: showLeadList ? "rgba(233, 30, 140, 0.15)" : "rgba(13, 17, 23, 0.82)",
                  borderColor: showLeadList ? "rgba(233, 30, 140, 0.3)" : "rgba(55, 65, 81, 0.4)",
                }}
              >
                <LayoutList size={16} className={showLeadList ? "text-primary-400" : "text-gray-400"} />
              </button>
            </div>
          )}

          {/* ── Lead List Panel (left overlay) ─────────────────── */}
          {showLeadList && (
            <div
              className="absolute left-3 bottom-[230px] z-30 w-[320px] max-h-[400px] rounded-xl backdrop-blur-md border overflow-hidden"
              style={{
                background: "rgba(13, 17, 23, 0.92)",
                borderColor: "rgba(55, 65, 81, 0.4)",
              }}
            >
              <div className="px-3 py-2 border-b border-gray-800/50">
                <div className="text-xs font-semibold text-gray-300">
                  {resultCount} {radarConfig.leadNounPlural}
                </div>
              </div>
              <div className="overflow-y-auto max-h-[360px]">
                {leadList
                  .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
                  .slice(0, 50)
                  .map((lead: any) => (
                    <button
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="w-full text-left px-3 py-2.5 border-b border-gray-800/30 hover:bg-gray-800/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-200 truncate max-w-[200px]">
                          {lead.name || lead.address}
                        </span>
                        <span
                          className="text-xs font-bold tabular-nums"
                          style={{ color: getScoreColor(lead.score || 0) }}
                        >
                          {lead.score?.toFixed(1)}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {lead.trigger} • {lead.distance?.toFixed?.(1) || "—"} mi
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* ── The Map ────────────────────────────────────────── */}
          <RevenueRadarMap
            radarConfig={radarConfig}
            geoData={geoData}
            onLeadClick={setSelectedLead}
            onMapMove={handleMapMove}
            flyTo={flyTo}
            radiusMiles={radius}
            activeFilters={filters}
            searchCenter={searchCenter}
          />

          {/* ── Lead Side Panel ────────────────────────────────── */}
          <LeadSidePanel
            selectedLead={selectedLead}
            radarConfig={radarConfig}
            radarIndustry={radarIndustry}
            selectedTrade={radarIndustry === "photographer" ? selectedNiche : selectedTrade}
            onClose={() => setSelectedLead(null)}
            onFlyToLead={handleFlyToLead}
          />
        </div>
      </div>
    </div>
  );
}
