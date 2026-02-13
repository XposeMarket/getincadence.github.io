/**
 * Revenue Radar — Google Geocoding Provider
 * 
 * Reverse geocodes lat/lng points to get real street addresses.
 * ONLY returns results for points that successfully geocode.
 * No fake address generation or extrapolation.
 */

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;
const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

export interface GeocodedAddress {
  formatted: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  county?: string;
}

/**
 * Reverse geocode a single point.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<GeocodedAddress | null> {
  try {
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: GOOGLE_API_KEY,
      result_type: "street_address|route|premise",
    });

    const res = await fetch(`${GEOCODE_URL}?${params}`);
    if (!res.ok) return null;

    const data = await res.json();

    if (data.status === "REQUEST_DENIED") {
      console.error("[Geocoding] API DENIED:", data.error_message);
      return null;
    }

    if (data.status !== "OK" || !data.results?.length) return null;

    const result = data.results[0];
    const components = result.address_components || [];

    const get = (type: string) =>
      components.find((c: any) => c.types.includes(type))?.long_name || "";

    let streetNum = get("street_number");
    const route = get("route");
    // Strip unit suffixes like "38C" → "38"
    streetNum = streetNum.replace(/[A-Za-z]+$/, "").trim();
    const street = streetNum && route ? `${streetNum} ${route}` : route || "";

    // Only return if we got a real street address
    if (!street || !route) return null;

    return {
      formatted: result.formatted_address,
      street,
      city: get("locality") || get("sublocality") || get("administrative_area_level_2"),
      state: components.find((c: any) => c.types.includes("administrative_area_level_1"))?.short_name || "",
      zip: get("postal_code"),
      county: get("administrative_area_level_2"),
    };
  } catch {
    return null;
  }
}

/**
 * Batch reverse geocode ALL points. Only returns the ones that resolve
 * to a real street address. No extrapolation, no fake addresses.
 */
export async function batchReverseGeocode(
  points: { lat: number; lng: number }[],
  maxGeocodes: number = 50,
): Promise<Map<number, GeocodedAddress>> {
  const results = new Map<number, GeocodedAddress>();
  if (points.length === 0) return results;

  // Geocode up to maxGeocodes points (evenly distributed)
  const step = Math.max(1, Math.floor(points.length / maxGeocodes));
  const indicesToGeocode: number[] = [];
  for (let i = 0; i < points.length && indicesToGeocode.length < maxGeocodes; i += step) {
    indicesToGeocode.push(i);
  }

  // Process in parallel batches of 5
  const BATCH_SIZE = 5;
  for (let b = 0; b < indicesToGeocode.length; b += BATCH_SIZE) {
    const batch = indicesToGeocode.slice(b, b + BATCH_SIZE);
    const promises = batch.map(async (idx) => {
      const addr = await reverseGeocode(points[idx].lat, points[idx].lng);
      if (addr) {
        results.set(idx, addr);
      }
    });
    await Promise.all(promises);

    // Small delay between batches to be respectful
    if (b + BATCH_SIZE < indicesToGeocode.length) {
      await new Promise((r) => setTimeout(r, 30));
    }
  }

  return results;
}
