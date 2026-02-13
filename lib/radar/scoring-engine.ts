/**
 * Revenue Radar — Unified Scoring Engine
 * 
 * Places-based scoring for B2B/Commercial/Retail/Photographer.
 * Census-powered, trade-weighted scoring for Residential.
 */

import type { PlacesResult } from "./google-places";
import type { StormEvent } from "./noaa-storms";
import type { CensusTractData } from "./census";
import type { TradeProfile } from "./trade-profiles";
import type { PhotoNicheProfile } from "./photo-niches";
import { distanceBetween } from "./google-places";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScoredLead {
  id: string;
  lat: number;
  lng: number;
  name: string;
  address: string;
  city?: string;
  state?: string;
  score: number;
  type: string;
  trigger: string;
  distance: number;
  reasons: string[];
  industry: string;
  [key: string]: any;
}

export interface GeoJSONFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: ScoredLead;
}

// ─── B2B / Commercial / Retail / Photographer Scoring ─────────────────────────
// (Unchanged from before — uses Google Places data)

export function scorePlacesResult(
  place: PlacesResult,
  industry: string,
  searchLat: number,
  searchLng: number,
  radiusMeters: number,
  filters: Record<string, boolean>,
): ScoredLead | null {
  const plat = place.geometry.location.lat;
  const plng = place.geometry.location.lng;
  const distM = distanceBetween(searchLat, searchLng, plat, plng);
  const distMiles = distM / 1609.344;

  const rating = place.rating ?? 0;
  const reviews = place.user_ratings_total ?? 0;
  const hasRating = place.rating !== undefined;
  const reasons: string[] = [];

  let score = 3.0;

  const lowRating = hasRating && rating < 3.8;
  if (filters.low_rating !== false && lowRating) {
    score += 2.5;
    reasons.push(`Low rating: ${rating}/5`);
  }

  const noWebsiteSignal = !hasRating || reviews < 5;
  if (filters.no_website !== false && noWebsiteSignal) {
    score += 1.5;
    reasons.push("Weak online presence detected");
  }

  const lowReviews = reviews < 20;
  if (filters.low_reviews !== false && lowReviews) {
    score += 1.5;
    reasons.push(`Only ${reviews} reviews`);
  }

  if (filters.industry_match !== false) score += 0.8;

  const distFactor = Math.max(0, 1.2 - (distM / radiusMeters) * 1.2);
  score += distFactor;
  score = Math.max(0, Math.min(10, score));

  if (reasons.length === 0) reasons.push("General opportunity signal");

  let trigger = "Opportunity";
  if (lowRating) trigger = "Low Rating";
  else if (noWebsiteSignal) trigger = "Weak Presence";
  else if (lowReviews) trigger = "Few Reviews";

  const typeMap: Record<string, string> = {
    restaurant: "Restaurant", dentist: "Dental Office", doctor: "Medical Clinic",
    lawyer: "Law Firm", accounting: "Accounting", real_estate_agency: "Real Estate",
    insurance_agency: "Insurance", car_repair: "Auto Repair", beauty_salon: "Salon",
    gym: "Gym/Fitness", veterinary_care: "Veterinary", store: "Retail Store",
    lodging: "Hotel/Lodging", church: "Church",
  };

  let category = "Business";
  if (place.types) {
    for (const t of place.types) {
      if (typeMap[t]) { category = typeMap[t]; break; }
    }
  }

  if (industry === "photographer") {
    const isVenue = place.types?.some(t =>
      ["lodging", "event_venue", "wedding_venue", "banquet_hall", "restaurant"].includes(t)
    ) || place.name.toLowerCase().match(/venue|event|ballroom|garden|estate|winery|manor/);
    if (isVenue) { score = Math.min(10, score + 1.0); trigger = "Venue"; }

    return {
      id: place.place_id, lat: plat, lng: plng,
      name: place.name, venueName: place.name,
      venueType: isVenue ? "Event Venue" : category,
      address: place.vicinity, score: +score.toFixed(1),
      type: isVenue ? "Event Venue" : category,
      trigger, distance: +distMiles.toFixed(2),
      rating, reviewCount: reviews, website: null,
      reasons, industry, place_id: place.place_id,
    };
  }

  return {
    id: place.place_id, lat: plat, lng: plng,
    name: place.name, businessName: place.name,
    address: place.vicinity, score: +score.toFixed(1),
    type: category, trigger, distance: +distMiles.toFixed(2),
    rating, reviewCount: reviews, category,
    website: null, phone: null, reasons,
    lowRating, noWebsite: noWebsiteSignal, lowReviews,
    industry, place_id: place.place_id,
  };
}

// ─── Residential Scoring (Census + Trade-Weighted) ────────────────────────────

export interface ResidentialSignals {
  // Census data for this point's tract
  tractData: CensusTractData | null;
  // Storm data
  nearbyStorms: StormEvent[];
  stormProximityMiles: number | null;
  // Permit
  hasPermitActivity: boolean;
  permitInfo?: string;
}

export function scoreResidentialLead(
  id: string,
  lat: number,
  lng: number,
  address: string,
  signals: ResidentialSignals,
  profile: TradeProfile,
  searchLat: number,
  searchLng: number,
  radiusMeters: number,
  filters: Record<string, boolean>,
): ScoredLead {
  const distM = distanceBetween(searchLat, searchLng, lat, lng);
  const distMiles = distM / 1609.344;
  const reasons: string[] = [];
  const w = profile.weights;
  const tract = signals.tractData;

  // Subscores: each 0–10, with reasonable baselines.
  // "No data" = neutral (5), not bad (0). Only confirmed
  // negatives (low income, low ownership) pull below 5.
  let ageScore = 5;       // neutral baseline
  let stormScore = 5;     // no storm = neutral, not bad
  let permitScore = 5;    // no permit data = neutral
  let incomeScore = 5;    // neutral
  let ownerScore = 5;     // neutral
  let distScore = 5;      // mid-range

  // ── Property age from census ───────────────────────────────
  const medianAge = tract?.estimatedMedianAge ?? null;
  const { primeMin, primeMax, extendedMin, extendedMax } = profile.ageSignals;

  if (filters.age !== false && medianAge !== null) {
    if (medianAge >= primeMin && medianAge <= primeMax) {
      ageScore = 10;
      reasons.push(
        profile.reasonTemplates.ageInPrime.replace("{age}", String(medianAge))
      );
    } else if (medianAge >= extendedMin && medianAge <= extendedMax) {
      ageScore = 8;
      reasons.push(
        profile.reasonTemplates.ageInExtended.replace("{age}", String(medianAge))
      );
    } else if (medianAge > extendedMax) {
      ageScore = 6; // very old, still opportunity
      reasons.push(`Home age: ~${medianAge}yr — older infrastructure`);
    } else if (medianAge > 0) {
      ageScore = 3; // too new for this trade
    }
  }

  // ── Storm proximity ─────────────────────────────────────
  if (filters.storm !== false && signals.nearbyStorms.length > 0) {
    const closest = signals.stormProximityMiles ?? 999;
    const mostRecent = Math.min(...signals.nearbyStorms.map(s => (s as any).daysAgo ?? 7));
    const when = mostRecent === 0 ? "today" : mostRecent === 1 ? "yesterday" : `${mostRecent}d ago`;

    if (closest < 5) {
      stormScore = 10;
      reasons.push(
        profile.reasonTemplates.stormImpact
          .replace("{dist}", closest.toFixed(1))
          .replace("{when}", when)
      );
    } else if (closest < 15) {
      stormScore = 8;
      reasons.push(
        profile.reasonTemplates.stormImpact
          .replace("{dist}", closest.toFixed(1))
          .replace("{when}", when)
      );
    }
    // else stays at 5 (neutral)
  }

  // ── Permit activity ───────────────────────────────────
  if (filters.permit !== false && signals.hasPermitActivity) {
    permitScore = 9;
    reasons.push(profile.reasonTemplates.permitCluster);
  }

  // ── Income tier from census ─────────────────────────────
  const income = tract?.medianIncome ?? null;
  if (filters.income !== false && income !== null) {
    if (income >= profile.incomeMinForHighPotential * 1.5) {
      incomeScore = 10;
      reasons.push(profile.reasonTemplates.highIncome);
    } else if (income >= profile.incomeMinForHighPotential) {
      incomeScore = 8;
      reasons.push(profile.reasonTemplates.highIncome);
    } else if (income >= profile.incomeMinForHighPotential * 0.7) {
      incomeScore = 6; // moderate — still viable
    } else if (income >= profile.incomeMinForHighPotential * 0.5) {
      incomeScore = 4; // lower
    } else {
      incomeScore = 2; // genuinely low income area
    }
  }

  // ── Owner-occupied % ─────────────────────────────────
  const ownerPct = tract?.ownerOccupiedPct ?? null;
  if (filters.owner !== false && ownerPct !== null) {
    if (ownerPct >= 80) {
      ownerScore = 10;
      reasons.push(
        profile.reasonTemplates.highOwnership.replace("{pct}", String(ownerPct))
      );
    } else if (ownerPct >= 65) {
      ownerScore = 8;
      reasons.push(
        profile.reasonTemplates.highOwnership.replace("{pct}", String(ownerPct))
      );
    } else if (ownerPct >= 50) {
      ownerScore = 6;
    } else if (ownerPct >= 30) {
      ownerScore = 3; // mostly renters
    } else {
      ownerScore = 1; // rental-heavy — real negative signal
    }
  }

  // ── Distance (smooth gradient, not cliff) ────────────────
  const distRatio = distM / radiusMeters;
  distScore = Math.max(1, 10 - distRatio * 8); // 10 at center → 2 at edge

  // ── Weighted total ─────────────────────────────────────
  const rawScore =
    ageScore * w.propertyAge +
    stormScore * w.stormProximity +
    permitScore * w.permitActivity +
    incomeScore * w.incomeTier +
    ownerScore * w.ownerOccupied +
    distScore * w.distance;

  const score = Math.max(1, Math.min(10, +rawScore.toFixed(1)));

  if (reasons.length === 0) reasons.push("Area opportunity signal");

  // Determine primary trigger
  let trigger = "Opportunity";
  const maxSub = Math.max(
    ageScore * w.propertyAge,
    stormScore * w.stormProximity,
    permitScore * w.permitActivity,
    incomeScore * w.incomeTier,
    ownerScore * w.ownerOccupied,
  );

  if (maxSub === stormScore * w.stormProximity && stormScore > 0) trigger = "Storm";
  else if (maxSub === ageScore * w.propertyAge && ageScore > 0) trigger = "Age";
  else if (maxSub === permitScore * w.permitActivity && permitScore > 0) trigger = "Permit";
  else if (maxSub === incomeScore * w.incomeTier && incomeScore > 0) trigger = "Income";
  else if (maxSub === ownerScore * w.ownerOccupied && ownerScore > 0) trigger = "Ownership";

  // Format display values
  const yearBuilt = tract?.medianYearBuilt;
  const incomeFmt = income ? `$${Math.round(income / 1000)}k` : "Unknown";
  const ownerFmt = ownerPct !== null ? `${ownerPct}%` : "Unknown";
  const ageFmt = medianAge !== null ? `~${medianAge} years` : "Unknown";

  return {
    id,
    lat,
    lng,
    name: address,
    address,
    score,
    type: "Residential",
    trigger,
    distance: +distMiles.toFixed(2),
    // Census-powered fields
    medianYearBuilt: yearBuilt ? String(yearBuilt) : "Unknown",
    propertyAge: ageFmt,
    medianIncome: incomeFmt,
    ownerOccupied: ownerFmt,
    // Signal flags
    hasStorm: signals.nearbyStorms.length > 0,
    hasPermit: signals.hasPermitActivity,
    hasAge: medianAge !== null && medianAge >= extendedMin,
    hasIncome: income !== null && income >= profile.incomeMinForHighPotential,
    hasOwnership: ownerPct !== null && ownerPct >= 55,
    // Storm details
    stormProximity: signals.stormProximityMiles
      ? `${signals.stormProximityMiles.toFixed(1)} mi`
      : "None nearby",
    permitHistory: signals.hasPermitActivity
      ? signals.permitInfo || "Active permits nearby"
      : "None nearby",
    // Canvassing helper
    nearbyCount: 0, // will be set by clustering
    reasons,
    industry: "residential_service",
    trade: profile.id,
  };
}

// ─── Photographer Scoring (Niche-Weighted, Visual Potential) ───────────────

export function scorePhotographerLead(
  place: PlacesResult,
  profile: PhotoNicheProfile,
  searchLat: number,
  searchLng: number,
  radiusMeters: number,
  filters: Record<string, boolean>,
): ScoredLead {
  const plat = place.geometry.location.lat;
  const plng = place.geometry.location.lng;
  const distM = distanceBetween(searchLat, searchLng, plat, plng);
  const distMiles = distM / 1609.344;
  const w = profile.weights;
  const reasons: string[] = [];

  const rating = place.rating ?? 0;
  const reviews = place.user_ratings_total ?? 0;
  const nameLC = place.name.toLowerCase();
  const typesLC = (place.types || []).map(t => t.toLowerCase());
  const allText = `${nameLC} ${typesLC.join(" ")}`;

  // ── Venue Match ──
  let venueScore = 5;
  const matchedTypes: string[] = [];
  for (const prime of profile.primeVenueTypes) {
    if (allText.includes(prime.toLowerCase())) matchedTypes.push(prime);
  }
  if (matchedTypes.length >= 3) { venueScore = 10; reasons.push(profile.reasonTemplates.venueMatch); }
  else if (matchedTypes.length >= 1) { venueScore = 8; reasons.push(profile.reasonTemplates.venueMatch); }
  else { venueScore = 4; }

  // ── High Rating ──
  let ratingScore = 5;
  if (rating >= 4.5 && reviews >= 50) {
    ratingScore = 10;
    reasons.push(profile.reasonTemplates.highRating.replace("{rating}", rating.toFixed(1)).replace("{reviews}", String(reviews)));
  } else if (rating >= 4.0 && reviews >= 20) {
    ratingScore = 8;
    reasons.push(profile.reasonTemplates.highRating.replace("{rating}", rating.toFixed(1)).replace("{reviews}", String(reviews)));
  } else if (rating >= 3.5) { ratingScore = 6; }
  else if (rating > 0) { ratingScore = 3; }

  // ── Photo-Friendly signals ──
  let photoScore = 5;
  const outdoorKW = ["park","garden","outdoor","field","lake","waterfront","pier","beach","trail","nature","scenic","overlook","terrace","rooftop","patio","courtyard","meadow","forest","river","pond","bridge"];
  const industrialKW = ["warehouse","industrial","dock","garage","parking","factory","rail","terminal","yard","hangar","port","overpass"];
  const urbanKW = ["gallery","museum","mural","art","monument","historic","architecture","tower","library","theater","station","cultural"];
  const hasOutdoor = outdoorKW.some(k => allText.includes(k));
  const hasIndustrial = industrialKW.some(k => allText.includes(k));
  const hasUrban = urbanKW.some(k => allText.includes(k));
  if (hasOutdoor) photoScore += 2;
  if (hasIndustrial) photoScore += 1.5;
  if (hasUrban) photoScore += 1.5;
  photoScore = Math.min(10, photoScore);
  if (hasOutdoor) reasons.push(profile.reasonTemplates.photoFriendly);
  else if (hasIndustrial || hasUrban) reasons.push(profile.reasonTemplates.scenic);

  // ── Accessibility ──
  let accessScore = 5;
  const isPublic = typesLC.some(t => ["park","museum","church","library","tourist_attraction"].includes(t));
  if (isPublic) accessScore = 8;
  if (place.opening_hours?.open_now === true) accessScore = Math.min(10, accessScore + 1);

  // ── Distance ──
  const distRatio = distM / radiusMeters;
  const distScore = Math.max(1, 10 - distRatio * 8);

  // ── Weighted total ──
  const rawScore = venueScore * w.venueMatch + ratingScore * w.highRating + photoScore * w.photoFriendly + accessScore * w.accessibility + distScore * w.distance;
  const score = Math.max(1, Math.min(10, +rawScore.toFixed(1)));
  if (reasons.length === 0) reasons.push("Location with visual potential");

  // Trigger
  let trigger = "Location";
  const maxW = Math.max(venueScore * w.venueMatch, ratingScore * w.highRating, photoScore * w.photoFriendly);
  if (maxW === venueScore * w.venueMatch && venueScore > 5) trigger = "Venue Match";
  else if (maxW === ratingScore * w.highRating && ratingScore > 5) trigger = "Popular";
  else if (maxW === photoScore * w.photoFriendly && photoScore > 5) trigger = "Scenic";

  // Location type
  const locTypeMap: Record<string, string> = { park: "Park", museum: "Museum", art_gallery: "Gallery", church: "Church", lodging: "Hotel", restaurant: "Restaurant", tourist_attraction: "Attraction", campground: "Campground", library: "Library", stadium: "Stadium" };
  let locationType = "Location";
  if (place.types) { for (const t of place.types) { if (locTypeMap[t]) { locationType = locTypeMap[t]; break; } } }
  if (nameLC.includes("venue") || nameLC.includes("banquet")) locationType = "Event Venue";
  else if (nameLC.includes("garden") || nameLC.includes("botanical")) locationType = "Garden";
  else if (nameLC.includes("winery") || nameLC.includes("vineyard")) locationType = "Winery";
  else if (nameLC.includes("warehouse")) locationType = "Warehouse";
  else if (nameLC.includes("marina") || nameLC.includes("dock")) locationType = "Marina";
  else if (nameLC.includes("gallery")) locationType = "Gallery";
  else if (nameLC.includes("cafe") || nameLC.includes("coffee")) locationType = "Cafe";

  return {
    id: place.place_id, lat: plat, lng: plng,
    name: place.name, venueName: place.name,
    venueType: locationType, locationType,
    address: place.vicinity, score, type: locationType,
    trigger, distance: +distMiles.toFixed(2),
    rating, reviewCount: reviews, website: null, phone: null,
    hasOutdoorSpace: hasOutdoor, hasIndustrialBackdrop: hasIndustrial,
    hasUrbanAesthetic: hasUrban, isPublicAccess: isPublic,
    nicheMatch: matchedTypes.length > 0, niche: profile.id,
    reasons, industry: "photographer", place_id: place.place_id,
  };
}

// ─── GeoJSON Conversion ───────────────────────────────────────────────────────

export function leadsToGeoJSON(leads: ScoredLead[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: leads.map((lead) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [lead.lng, lead.lat] as [number, number],
      },
      properties: lead,
    })),
  };
}
