"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  X, MapPin, Star, Globe, Phone, Calendar, Home, CloudLightning,
  FileText, TrendingUp, ExternalLink, Crosshair, Check, Loader2,
  ArrowUpRight, AlertCircle, DollarSign, Key, Users
} from "lucide-react";
import type { RadarIndustryConfig } from "@/lib/radar-config";
import { getScoreColor, getScoreLabel } from "@/lib/radar-config";
import { useRouter } from "next/navigation";

interface LeadSidePanelProps {
  selectedLead: any | null;
  radarConfig: RadarIndustryConfig;
  radarIndustry?: string;
  selectedTrade?: string;
  onClose: () => void;
  onCreateOpportunity?: (lead: any) => void;
  onFlyToLead?: (lead: any) => void;
}

type CreateState = "idle" | "creating" | "success" | "error";

const LeadSidePanel: React.FC<LeadSidePanelProps> = ({
  selectedLead,
  radarConfig,
  radarIndustry,
  selectedTrade,
  onClose,
  onCreateOpportunity,
  onFlyToLead,
}) => {
  const [localLead, setLocalLead] = useState<any>(selectedLead);
  const [isClosing, setIsClosing] = useState(false);
  const [placeDetails, setPlaceDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [streetViewData, setStreetViewData] = useState<{ available: boolean; urls: string[] } | null>(null);
  const [mapsUrl, setMapsUrl] = useState<string | null>(null);
  const [svIndex, setSvIndex] = useState(0);
  const [createState, setCreateState] = useState<CreateState>("idle");
  const [createResult, setCreateResult] = useState<any>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const router = useRouter();
  const ANIM_MS = 280;

  useEffect(() => {
    if (selectedLead) {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setLocalLead(selectedLead);
      setIsClosing(false);
      // Reset create state when new lead selected
      setCreateState("idle");
      setCreateResult(null);
      setCreateError(null);
      setStreetViewData(null);
      setMapsUrl(null);
      setSvIndex(0);
      return;
    }
    if (localLead) {
      setIsClosing(true);
      timeoutRef.current = window.setTimeout(() => {
        setLocalLead(null);
        setIsClosing(false);
        timeoutRef.current = null;
      }, ANIM_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLead]);

  useEffect(() => {
    return () => { if (timeoutRef.current) window.clearTimeout(timeoutRef.current); };
  }, []);

  // Fetch place details (for Places-based leads) + street view (for all leads)
  useEffect(() => {
    if (!selectedLead) {
      setPlaceDetails(null);
      setStreetViewData(null);
      setMapsUrl(null);
      return;
    }
    let cancelled = false;
    setLoadingDetails(true);

    if (selectedLead.place_id) {
      // Places-based lead: fetch details + street view together
      const params = new URLSearchParams({ place_id: selectedLead.place_id });
      if (selectedLead.lat) params.set("lat", String(selectedLead.lat));
      if (selectedLead.lng) params.set("lng", String(selectedLead.lng));
      fetch(`/api/revenue-radar/place-details?${params}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (cancelled) return;
          if (data?.details) setPlaceDetails(data.details);
          if (data?.streetView) setStreetViewData(data.streetView);
          if (data?.mapsUrl) setMapsUrl(data.mapsUrl);
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoadingDetails(false); });
    } else if (selectedLead.lat && selectedLead.lng) {
      // Non-places lead (residential): fetch street view only
      setPlaceDetails(null);
      const params = new URLSearchParams({
        lat: String(selectedLead.lat),
        lng: String(selectedLead.lng),
      });
      fetch(`/api/revenue-radar/street-view?${params}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (cancelled) return;
          if (data?.streetView) setStreetViewData(data.streetView);
          if (data?.mapsUrl) setMapsUrl(data.mapsUrl);
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoadingDetails(false); });
    } else {
      setPlaceDetails(null);
      setStreetViewData(null);
      setMapsUrl(null);
      setLoadingDetails(false);
    }

    return () => { cancelled = true; };
  }, [selectedLead?.place_id, selectedLead?.lat, selectedLead?.lng, selectedLead?.id]);

  if (!localLead) return null;

  const lead = selectedLead || localLead;
  const score = lead.score ?? 0;
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);
  const translateClass = isClosing ? "translate-x-full" : "translate-x-0";

  // Parse reasons if stringified
  let reasons: string[] = lead.reasons || [];
  if (typeof reasons === "string") {
    try { reasons = JSON.parse(reasons); } catch { reasons = []; }
  }

  // ── Create Opportunity Handler ──────────────────────────────
  const handleCreateOpportunity = async () => {
    setCreateState("creating");
    setCreateError(null);

    try {
      // Merge placeDetails into lead so the API has full data (website, phone, hours, etc.)
      const enrichedLead = {
        ...lead,
        reasons: Array.isArray(lead.reasons) ? lead.reasons : [],
        // Overlay place details if available
        ...(placeDetails ? {
          website: placeDetails.website || lead.website,
          phone: placeDetails.formatted_phone_number || lead.phone,
          address: placeDetails.formatted_address || lead.address,
          businessHours: placeDetails.opening_hours?.weekday_text || null,
          placeTypes: placeDetails.types || null,
          placePhotos: placeDetails.photos?.slice(0, 5) || null,
        } : {}),
      };

      const res = await fetch("/api/revenue-radar/create-opportunity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead: enrichedLead,
          industry: radarIndustry || radarConfig.id || "residential_service",
          trade: selectedTrade || "general",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateState("error");
        setCreateError(data.error || "Failed to create opportunity");
        return;
      }

      setCreateState("success");
      setCreateResult(data);

      // Also fire the parent callback if provided
      onCreateOpportunity?.(lead);
    } catch (err) {
      setCreateState("error");
      setCreateError("Network error. Please try again.");
    }
  };

  const handleGoToDeal = () => {
    if (createResult?.dealUrl) {
      router.push(createResult.dealUrl);
    }
  };

  return (
    <div
      className={`absolute right-0 top-0 h-full z-50 transform transition-transform ease-out ${translateClass}`}
      style={{ width: "100%", maxWidth: 380, transitionDuration: `${ANIM_MS}ms` }}
    >
      <div
        className="h-full flex flex-col overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0D1117 0%, #111827 100%)",
          borderLeft: "1px solid rgba(55, 65, 81, 0.5)",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-800/60">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: scoreColor }}
            />
            <span className="text-sm font-semibold text-gray-200">
              Lead Intelligence
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Content ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {/* Score Hero */}
          <div className="px-4 pt-5 pb-4">
            <div className="flex items-start gap-4">
              <div>
                <div
                  className="text-4xl font-bold tabular-nums"
                  style={{ color: scoreColor, lineHeight: 1 }}
                >
                  {score.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500 mt-1">/ 10</div>
              </div>
              <div className="flex-1 pt-1">
                <div
                  className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block"
                  style={{
                    background: `${scoreColor}18`,
                    color: scoreColor,
                  }}
                >
                  {scoreLabel} confidence
                </div>
                <div className="mt-2.5 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(5, score * 10)}%`,
                      background: `linear-gradient(90deg, ${scoreColor}80, ${scoreColor})`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800/50" />

          {/* Lead Identity */}
          <div className="px-4 py-4">
            <h3 className="text-base font-semibold text-gray-100 leading-tight">
              {lead.name || lead.businessName || lead.venueName || lead.address || "Lead"}
            </h3>
            {lead.address && (
              <div className="flex items-center gap-1.5 mt-1.5 text-sm text-gray-400">
                <MapPin size={13} className="shrink-0" />
                <span>
                  {lead.address}
                  {lead.city && `, ${lead.city}`}
                  {lead.state && ` ${lead.state}`}
                </span>
              </div>
            )}
            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {lead.type && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-gray-800/80 text-gray-300 border border-gray-700/50">
                  {lead.type}
                </span>
              )}
              {lead.trigger && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-gray-800/80 text-gray-300 border border-gray-700/50">
                  {lead.trigger}
                </span>
              )}
              {lead.trade && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-primary-500/10 text-primary-400 border border-primary-500/30">
                  {lead.trade.replace(/_/g, " ")}
                </span>
              )}
              {lead.distance != null && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-gray-800/80 text-gray-400 border border-gray-700/50">
                  {lead.distance.toFixed?.(1) || lead.distance} mi away
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-gray-800/50" />

          {/* ── Dynamic Fields Based on Industry ───────────────── */}
          <div className="px-4 py-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {loadingDetails ? 'Loading details...' : 'Signals'}
            </div>
            <div className="space-y-0">
              {radarConfig.panelFields.map((field) => {
                const detailValue = placeDetails?.[field.key === 'phone' ? 'formatted_phone_number' : field.key === 'address' ? 'formatted_address' : field.key];
                const value = detailValue ?? lead[field.key];
                if (value === undefined || value === null || field.key === 'address') return null;

                let displayValue: React.ReactNode = String(value);
                let icon: React.ReactNode = null;

                if (field.type === 'boolean') {
                  displayValue = value ? 'Yes' : 'No';
                } else if (field.type === 'url' && value) {
                  displayValue = (
                    <a
                      href={String(value)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <span className="truncate max-w-[160px]">{String(value).replace(/^https?:\/\//, '')}</span>
                      <ExternalLink size={11} />
                    </a>
                  );
                } else if (field.type === 'number') {
                  displayValue = typeof value === 'number' ? value.toFixed?.(1) || value : value;
                }

                // Icon mapping
                if (field.key.includes('storm') || field.key === 'hasStorm') icon = <CloudLightning size={14} className="text-red-400" />;
                else if (field.key.includes('permit') || field.key === 'hasPermit') icon = <FileText size={14} className="text-blue-400" />;
                else if (field.key.includes('age') || field.key.includes('property') || field.key.includes('YearBuilt')) icon = <Home size={14} className="text-emerald-400" />;
                else if (field.key === 'medianIncome') icon = <DollarSign size={14} className="text-yellow-400" />;
                else if (field.key === 'ownerOccupied') icon = <Key size={14} className="text-purple-400" />;
                else if (field.key === 'rating') icon = <Star size={14} className="text-yellow-400" />;
                else if (field.key === 'website') icon = <Globe size={14} className="text-blue-400" />;
                else if (field.key === 'phone') icon = <Phone size={14} className="text-gray-400" />;
                else if (field.key === 'reviewCount') icon = <Users size={14} className="text-purple-400" />;
                else if (field.key === 'distance') icon = <Crosshair size={14} className="text-gray-400" />;

                return (
                  <div
                    key={field.key}
                    className="flex items-center justify-between py-2.5 border-b border-gray-800/40 last:border-0"
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      {icon}
                      <span>{field.label}</span>
                    </div>
                    <div className="text-sm font-medium text-gray-200">
                      {displayValue}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Reasons / Signal Breakdown ─────────────────────── */}
          {reasons.length > 0 && (
            <>
              <div className="border-t border-gray-800/50" />
              <div className="px-4 py-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Why this {radarConfig.leadNoun}?
                </div>
                <div className="space-y-2">
                  {reasons.map((reason: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-sm text-gray-300"
                    >
                      <div
                        className="w-1 h-1 rounded-full mt-2 shrink-0"
                        style={{ background: scoreColor }}
                      />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Canvassing Suggestion (Residential only) ──────── */}
          {lead.nearbyCount > 0 && (
            <>
              <div className="border-t border-gray-800/50" />
              <div className="px-4 py-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Canvassing Opportunity
                </div>
                <div className="px-3 py-2.5 rounded-lg border" style={{ background: 'rgba(233,30,140,0.06)', borderColor: 'rgba(233,30,140,0.2)' }}>
                  <span className="text-sm text-gray-300">
                    <span className="font-semibold" style={{ color: '#E91E8C' }}>{lead.nearbyCount}</span>{" "}
                    similar {lead.nearbyCount === 1 ? 'property' : 'properties'} within 0.3 mi
                  </span>
                </div>
              </div>
            </>
          )}

          {/* ── Street View Preview ────────────────────────── */}
          {streetViewData?.available && streetViewData.urls.length > 0 && (
            <>
              <div className="border-t border-gray-800/50" />
              <div className="px-4 py-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Street View Preview
                </div>
                {/* Image with angle navigation */}
                <div className="relative rounded-lg overflow-hidden bg-gray-900">
                  <img
                    src={streetViewData.urls[svIndex]}
                    alt={`Street view angle ${svIndex + 1}`}
                    className="w-full h-[180px] object-cover"
                    loading="lazy"
                  />
                  {/* Angle dots */}
                  {streetViewData.urls.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {streetViewData.urls.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setSvIndex(i)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            i === svIndex
                              ? "bg-white scale-110"
                              : "bg-white/40 hover:bg-white/70"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                  {/* Angle arrows */}
                  {streetViewData.urls.length > 1 && (
                    <>
                      <button
                        onClick={() => setSvIndex((svIndex - 1 + streetViewData.urls.length) % streetViewData.urls.length)}
                        className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white/80 hover:bg-black/70 transition-colors"
                      >
                        ‹
                      </button>
                      <button
                        onClick={() => setSvIndex((svIndex + 1) % streetViewData.urls.length)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white/80 hover:bg-black/70 transition-colors"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 mt-2">
                  {svIndex + 1} of {streetViewData.urls.length} angles • Powered by Google Street View
                </div>
              </div>
            </>
          )}

          {/* ── Open in Google Maps (when available) ────────── */}
          {mapsUrl && (
            <>
              <div className="border-t border-gray-800/50" />
              <div className="px-4 py-3">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium text-gray-300 border border-gray-700/60 hover:bg-gray-800/50 transition-colors"
                >
                  <MapPin size={14} />
                  Open in Google Maps
                  <ExternalLink size={12} />
                </a>
              </div>
            </>
          )}
        </div>

        {/* ── Footer Actions ──────────────────────────────────── */}
        <div className="border-t border-gray-800/50 p-4" style={{ background: "rgba(13,17,23,0.95)" }}>
          <div className="flex flex-col gap-2">
            {/* Create Opportunity — state machine */}
            {createState === "idle" && (
              <button
                onClick={handleCreateOpportunity}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #E91E8C, #C41E7A)" }}
              >
                Create Opportunity
              </button>
            )}

            {createState === "creating" && (
              <button
                disabled
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #E91E8C, #C41E7A)", opacity: 0.7 }}
              >
                <Loader2 size={14} className="animate-spin" />
                Creating...
              </button>
            )}

            {createState === "success" && createResult && (
              <>
                {/* Success banner */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                  style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.25)" }}
                >
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-emerald-400">Opportunity created</div>
                    <div className="text-[11px] text-gray-400 truncate">
                      Added to {createResult.stageName} stage
                    </div>
                  </div>
                </div>

                {/* Go to deal button */}
                <button
                  onClick={handleGoToDeal}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #E91E8C, #C41E7A)" }}
                >
                  <ArrowUpRight size={14} />
                  Open Deal
                </button>
              </>
            )}

            {createState === "error" && (
              <>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                  style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)" }}
                >
                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                  <div className="text-xs text-red-400">{createError}</div>
                </div>
                <button
                  onClick={() => setCreateState("idle")}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #E91E8C, #C41E7A)" }}
                >
                  Try Again
                </button>
              </>
            )}

            {/* Center on Map button (always visible) */}
            <button
              onClick={() => onFlyToLead?.(lead)}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-gray-300 border border-gray-700/60 hover:bg-gray-800/50 transition-colors"
            >
              Center on Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadSidePanel;
