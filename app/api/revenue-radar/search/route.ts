import { NextRequest, NextResponse } from "next/server";
import { getRadarConfig, type RadarIndustryType } from "@/lib/radar-config";
import {
  searchPlaces,
  searchPlacesWithKeywords,
  milesToMeters,
  distanceBetween,
  scorePlacesResult,
  scoreResidentialLead,
  scorePhotographerLead,
  leadsToGeoJSON,
  getStormData,
  batchReverseGeocode,
  getCensusData,
  batchGetTracts,
  getTradeProfile,
  getPhotoNicheProfile,
  clusterLeads,
  clustersToGeoJSON,
  clusterLeadsToGeoJSON,
  makeCacheKey,
  getCachedResult,
  setCachedResult,
  cleanExpiredCache,
  checkRateLimit,
  incrementSearchCount,
} from "@/lib/radar";
import type { ScoredLead, ResidentialSignals } from "@/lib/radar/scoring-engine";
import type { CensusTractData } from "@/lib/radar/census";
import { createClient } from "@/lib/supabase/server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function randomPointInRadius(
  cLng: number, cLat: number, rM: number, rand: () => number,
): [number, number] {
  const r = rM * Math.sqrt(rand());
  const theta = rand() * 2 * Math.PI;
  const latRad = cLat * Math.PI / 180;
  const mLat = 111132.92 - 559.82 * Math.cos(2 * latRad);
  const mLng = 111412.84 * Math.cos(latRad);
  return [cLng + (r * Math.cos(theta)) / mLng, cLat + (r * Math.sin(theta)) / mLat];
}

// ─── Residential Builder (Census + Trade-Weighted) ────────────────────────────

async function buildResidentialResults(
  lat: number, lng: number, radiusMiles: number,
  filters: Record<string, boolean>,
  maxResults: number,
  trade: string,
) {
  const radiusM = milesToMeters(radiusMiles);
  const profile = getTradeProfile(trade);

  // 1. Fetch census data + storm data in parallel
  const [censusData, { storms, stormEvents }] = await Promise.all([
    getCensusData(lat, lng, radiusMiles),
    getStormData(lat, lng, radiusMiles),
  ]);

  // Build tract lookup
  const tractMap = new Map<string, CensusTractData>();
  for (const t of censusData.tracts) {
    tractMap.set(t.tractId, t);
  }

  // 2. Generate candidate points
  const count = Math.min(maxResults * 2, Math.floor(80 + radiusMiles * 3));
  const rand = seededRandom(Math.floor(lat * 1000 + lng * 100));
  const points: { lat: number; lng: number }[] = [];
  for (let i = 0; i < count; i++) {
    const [pLng, pLat] = randomPointInRadius(lng, lat, radiusM, rand);
    points.push({ lat: pLat, lng: pLng });
  }

  // 3. Batch geocode + batch tract lookup in parallel
  const [geocoded, tractAssignments] = await Promise.all([
    batchReverseGeocode(points, Math.min(points.length, 60)),
    batchGetTracts(points, 30),
  ]);

  // 4. Score ONLY points that got real geocoded addresses
  const leads: ScoredLead[] = [];

  for (let i = 0; i < points.length; i++) {
    const addr = geocoded.get(i);
    if (!addr) continue; // Skip — no real address

    const p = points[i];
    const tractId = tractAssignments.get(i);
    const tract = tractId ? tractMap.get(tractId) ?? null : null;

    // Storm proximity
    let closestStormMiles: number | null = null;
    const nearbyStorms = stormEvents.filter((s) => {
      const d = distanceBetween(p.lat, p.lng, s.lat, s.lng) / 1609.344;
      if (closestStormMiles === null || d < closestStormMiles) closestStormMiles = d;
      return d < 15;
    });

    // Permit (still estimated — replace with real data when available)
    const hasPermit = rand() < 0.12;

    const signals: ResidentialSignals = {
      tractData: tract,
      nearbyStorms,
      stormProximityMiles: closestStormMiles,
      hasPermitActivity: hasPermit,
      permitInfo: hasPermit ? "Estimated permit activity in area" : undefined,
    };

    const lead = scoreResidentialLead(
      `res-${i}`, p.lat, p.lng, addr.street,
      signals, profile,
      lat, lng, radiusM, filters,
    );

    lead.city = addr.city;
    lead.state = addr.state;

    // Canvassing: count nearby leads (will be finalized after all scored)
    leads.push(lead);
  }

  // 5. Set canvassing counts (nearby leads within 0.3mi)
  for (let i = 0; i < leads.length; i++) {
    let nearby = 0;
    for (let j = 0; j < leads.length; j++) {
      if (i === j) continue;
      const d = distanceBetween(leads[i].lat, leads[i].lng, leads[j].lat, leads[j].lng);
      if (d < 483) nearby++; // 0.3mi = ~483m
    }
    leads[i].nearbyCount = nearby;
  }

  // Sort by score
  leads.sort((a, b) => b.score - a.score);

  // 6. Cluster into neighborhoods
  const { clusters, singles } = clusterLeads(leads, 3);
  const neighborhoodZones = clustersToGeoJSON(clusters);
  const allLeadsGeoJSON = clusterLeadsToGeoJSON(clusters, singles);

  // Build permit points
  const permitFeatures = leads
    .filter((l) => l.hasPermit)
    .slice(0, 50)
    .map((l, idx) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [l.lng, l.lat] },
      properties: {
        id: `permit-${idx}`,
        permitType: rand() < 0.5 ? "Building" : "Mechanical",
        date: `${1 + Math.floor(rand() * 14)} days ago`,
        address: l.address,
      },
    }));

  return {
    leads: allLeadsGeoJSON,
    storms,
    permits: { type: "FeatureCollection" as const, features: permitFeatures },
    neighborhoods: neighborhoodZones,
    censusStats: {
      areaMedianYearBuilt: censusData.areaMedianYearBuilt,
      areaMedianIncome: censusData.areaMedianIncome,
      areaOwnerOccupiedPct: censusData.areaOwnerOccupiedPct,
      areaTotalUnits: censusData.areaTotalUnits,
      tractsLoaded: censusData.tracts.length,
    },
    trade: profile.id,
  };
}

// ─── Photographer Builder (Niche-Specific) ──────────────────────────────────

async function buildPhotographerResults(
  lat: number, lng: number, radiusMiles: number,
  filters: Record<string, boolean>, maxResults: number,
  niche: string,
) {
  const radiusM = milesToMeters(radiusMiles);
  const profile = getPhotoNicheProfile(niche);

  // Use niche-specific keywords instead of generic photographer search
  const places = await searchPlacesWithKeywords(
    profile.searchKeywords, lat, lng, radiusM, maxResults
  );

  const leads: ScoredLead[] = [];
  for (const place of places) {
    const scored = scorePhotographerLead(place, profile, lat, lng, radiusM, filters);
    leads.push(scored);
  }
  leads.sort((a, b) => b.score - a.score);

  return {
    leads: leadsToGeoJSON(leads),
    storms: { type: "FeatureCollection" as const, features: [] },
    permits: { type: "FeatureCollection" as const, features: [] },
    niche: profile.id,
  };
}

// ─── Places-Based Industries (B2B, Commercial, Retail) ──────────────────────

async function buildPlacesResults(
  industry: string, lat: number, lng: number, radiusMiles: number,
  filters: Record<string, boolean>, maxResults: number,
) {
  const radiusM = milesToMeters(radiusMiles);
  const places = await searchPlaces(industry, lat, lng, radiusM, maxResults);
  const leads: ScoredLead[] = [];
  for (const place of places) {
    const scored = scorePlacesResult(place, industry, lat, lng, radiusM, filters);
    if (scored) leads.push(scored);
  }
  leads.sort((a, b) => b.score - a.score);

  return {
    leads: leadsToGeoJSON(leads),
    storms: { type: "FeatureCollection" as const, features: [] },
    permits: { type: "FeatureCollection" as const, features: [] },
  };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "39.4143");
  const lng = parseFloat(searchParams.get("lng") || "-77.4105");
  const radius = parseFloat(searchParams.get("radius") || "10");
  const industry = (searchParams.get("industry") || "residential_service") as RadarIndustryType;
  const trade = searchParams.get("trade") || "general";
  const filters: Record<string, boolean> = searchParams.get("filters")
    ? JSON.parse(searchParams.get("filters")!)
    : {};

  const config = getRadarConfig(industry);
  const clampedRadius = Math.min(radius, config.maxRadiusMiles);

  // Rate Limiting
  let orgId: string | null = null;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("users").select("org_id").eq("id", user.id).single();
      orgId = profile?.org_id || null;
    }
  } catch { /* demo mode */ }

  if (orgId) {
    const rateLimit = await checkRateLimit(orgId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: `Daily limit reached (${rateLimit.limit}/day).`, remaining: 0, limit: rateLimit.limit, resetAt: rateLimit.resetAt },
        { status: 429 }
      );
    }
  }

  // Cache (includes trade in key for residential)
  const noCache = searchParams.get("nocache") === "1";
  const cacheKey = makeCacheKey(lat, lng, `${industry}:${trade}`, clampedRadius);

  if (!noCache) {
    const cached = await getCachedResult(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, meta: { ...cached.meta, cached: true, timestamp: new Date().toISOString() } });
    }
  }

  // Run Search
  let data: any;
  try {
    switch (industry) {
      case "b2b_service":
      case "default":
      case "commercial_service":
      case "retail":
        data = await buildPlacesResults(industry, lat, lng, clampedRadius, filters, config.maxResults);
        break;
      case "photographer":
        data = await buildPhotographerResults(lat, lng, clampedRadius, filters, config.maxResults, trade);
        break;
      default:
        data = await buildResidentialResults(lat, lng, clampedRadius, filters, config.maxResults, trade);
        break;
    }
  } catch (err) {
    console.error("Radar search error:", err);
    data = {
      leads: { type: "FeatureCollection", features: [] },
      storms: { type: "FeatureCollection", features: [] },
      permits: { type: "FeatureCollection", features: [] },
    };
  }

  const resultMeta = {
    industry, trade,
    center: { lat, lng },
    radius: clampedRadius,
    maxResults: config.maxResults,
    resultCount: data.leads?.features?.length || 0,
    cached: false,
    timestamp: new Date().toISOString(),
    censusStats: data.censusStats || null,
  };

  // Write Cache
  await setCachedResult(cacheKey, lat, lng, `${industry}:${trade}`, clampedRadius, {
    leads: data.leads, storms: data.storms, permits: data.permits,
    meta: resultMeta,
  });

  if (orgId) await incrementSearchCount(orgId);
  cleanExpiredCache().catch(() => {});

  return NextResponse.json({ ...data, meta: resultMeta });
}
