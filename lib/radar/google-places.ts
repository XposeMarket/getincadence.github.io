/**
 * Revenue Radar — Google Places Data Provider
 * 
 * Calls Google Places Nearby Search API for B2B, Commercial, Photographer industries.
 * Only called server-side. Never exposes the API key to the client.
 */

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;
const PLACES_NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
const PLACES_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlacesResult {
  place_id: string;
  name: string;
  vicinity: string;           // short address
  geometry: { location: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  business_status?: string;
  types?: string[];
  opening_hours?: { open_now?: boolean };
  photos?: { photo_reference: string }[];
  price_level?: number;
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  url?: string;               // Google Maps URL
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  business_status?: string;
}

export interface PlacesSearchParams {
  lat: number;
  lng: number;
  radiusMeters: number;
  keyword?: string;
  type?: string;
  maxResults?: number;        // we'll paginate up to this
}

// ─── Industry → Search Config ─────────────────────────────────────────────────

interface IndustrySearchConfig {
  types: string[];            // Google Places types to search
  keywords: string[];         // keyword variations to broaden results
  maxPerKeyword: number;      // max results per keyword search (up to 60 from API)
}

export const INDUSTRY_SEARCH_CONFIGS: Record<string, IndustrySearchConfig> = {
  b2b_service: {
    types: ['establishment'],
    keywords: [
      'business services',
      'marketing agency',
      'consulting firm',
      'IT services',
      'accounting firm',
      'law office',
      'insurance agency',
      'real estate office',
    ],
    maxPerKeyword: 20,
  },
  commercial_service: {
    types: ['establishment'],
    keywords: [
      'office building',
      'commercial property',
      'shopping center',
      'medical office',
      'industrial park',
      'warehouse',
    ],
    maxPerKeyword: 20,
  },
  photographer: {
    types: ['establishment'],
    keywords: [
      'wedding venue',
      'event space',
      'banquet hall',
      'conference center',
      'hotel ballroom',
      'winery venue',
      'garden venue',
    ],
    maxPerKeyword: 20,
  },
  retail: {
    types: ['establishment'],
    keywords: [
      'retail store',
      'shopping center',
      'franchise',
      'restaurant',
      'fast food',
    ],
    maxPerKeyword: 20,
  },
};

// ─── Nearby Search ────────────────────────────────────────────────────────────

async function nearbySearch(
  lat: number,
  lng: number,
  radiusMeters: number,
  keyword: string,
  type?: string,
  pageToken?: string,
): Promise<{ results: PlacesResult[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: String(Math.min(radiusMeters, 50000)), // Google max is 50km
    keyword,
    key: GOOGLE_API_KEY,
  });

  if (type) params.set("type", type);
  if (pageToken) params.set("pagetoken", pageToken);

  const res = await fetch(`${PLACES_NEARBY_URL}?${params}`, {
    next: { revalidate: 0 }, // no Next.js cache for API calls
  });

  if (!res.ok) {
    console.error(`Places API error: ${res.status} ${res.statusText}`);
    return { results: [] };
  }

  const data = await res.json();

  if (data.status === "REQUEST_DENIED") {
    console.error("Places API denied:", data.error_message);
    return { results: [] };
  }

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("Places API status:", data.status, data.error_message);
  }

  return {
    results: data.results || [],
    nextPageToken: data.next_page_token,
  };
}

// ─── Place Details (only called on user click, not bulk) ──────────────────────

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: "place_id,name,formatted_address,formatted_phone_number,website,url,rating,user_ratings_total,types,business_status",
    key: GOOGLE_API_KEY,
  });

  const res = await fetch(`${PLACES_DETAILS_URL}?${params}`);
  if (!res.ok) return null;

  const data = await res.json();
  if (data.status !== "OK") return null;

  return data.result;
}

// ─── Main Search Function ─────────────────────────────────────────────────────

export async function searchPlaces(
  industry: string,
  lat: number,
  lng: number,
  radiusMeters: number,
  maxResults: number = 100,
): Promise<PlacesResult[]> {
  const config = INDUSTRY_SEARCH_CONFIGS[industry];
  if (!config) {
    console.warn(`No Places config for industry: ${industry}`);
    return [];
  }

  const seen = new Set<string>();
  const allResults: PlacesResult[] = [];

  // Search with each keyword, dedup by place_id
  for (const keyword of config.keywords) {
    if (allResults.length >= maxResults) break;

    try {
      const { results } = await nearbySearch(
        lat, lng, radiusMeters,
        keyword,
        config.types[0],
      );

      for (const place of results) {
        if (seen.has(place.place_id)) continue;
        if (place.business_status === "CLOSED_PERMANENTLY") continue;

        seen.add(place.place_id);
        allResults.push(place);

        if (allResults.length >= maxResults) break;
      }
    } catch (err) {
      console.error(`Places search failed for "${keyword}":`, err);
    }

    // Small delay between calls to be respectful
    await new Promise((r) => setTimeout(r, 100));
  }

  return allResults;
}

// ─── Dynamic Keyword Search (for photographer niches) ─────────────────────────

export async function searchPlacesWithKeywords(
  keywords: string[],
  lat: number,
  lng: number,
  radiusMeters: number,
  maxResults: number = 150,
): Promise<PlacesResult[]> {
  const seen = new Set<string>();
  const allResults: PlacesResult[] = [];

  for (const keyword of keywords) {
    if (allResults.length >= maxResults) break;

    try {
      const { results } = await nearbySearch(lat, lng, radiusMeters, keyword, "establishment");
      for (const place of results) {
        if (seen.has(place.place_id)) continue;
        if (place.business_status === "CLOSED_PERMANENTLY") continue;
        seen.add(place.place_id);
        allResults.push(place);
        if (allResults.length >= maxResults) break;
      }
    } catch (err) {
      console.error(`Places search failed for "${keyword}":`, err);
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  return allResults;
}

// ─── Street View Static API ──────────────────────────────────────────────────

const STREET_VIEW_URL = "https://maps.googleapis.com/maps/api/streetview";
const STREET_VIEW_META_URL = "https://maps.googleapis.com/maps/api/streetview/metadata";

/**
 * Check if Street View imagery exists for a location.
 */
export async function hasStreetView(lat: number, lng: number): Promise<boolean> {
  try {
    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      key: GOOGLE_API_KEY,
    });
    const res = await fetch(`${STREET_VIEW_META_URL}?${params}`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === "OK";
  } catch {
    return false;
  }
}

/**
 * Get Street View image URLs for a location at multiple angles.
 * Returns up to 3 URLs for different headings.
 */
export function getStreetViewUrls(
  lat: number,
  lng: number,
  size: string = "400x250",
): string[] {
  const headings = [0, 120, 240];
  return headings.map((heading) => {
    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      size,
      heading: String(heading),
      pitch: "5",
      fov: "90",
      key: GOOGLE_API_KEY,
    });
    return `${STREET_VIEW_URL}?${params}`;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function milesToMeters(mi: number): number {
  return mi * 1609.344;
}

export function distanceBetween(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
