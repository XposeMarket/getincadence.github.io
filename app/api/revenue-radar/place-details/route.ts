import { NextRequest, NextResponse } from "next/server";
import { getPlaceDetails, hasStreetView, getStreetViewUrls } from "@/lib/radar";

/**
 * GET /api/revenue-radar/place-details?place_id=xxx&lat=xx&lng=xx
 * 
 * Fetches full details for a single place (phone, website, etc).
 * If lat/lng provided, also returns Street View image URLs.
 * Only called when user clicks a lead — NOT in bulk.
 */
export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("place_id");
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");

  if (!placeId) {
    return NextResponse.json(
      { error: "place_id is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch place details + street view check in parallel
    const detailsPromise = getPlaceDetails(placeId);
    
    let streetViewPromise: Promise<{
      available: boolean;
      urls: string[];
    }> | null = null;

    if (lat && lng) {
      const pLat = parseFloat(lat);
      const pLng = parseFloat(lng);
      streetViewPromise = hasStreetView(pLat, pLng).then((available) => ({
        available,
        urls: available ? getStreetViewUrls(pLat, pLng, "400x250") : [],
      }));
    }

    const [details, streetView] = await Promise.all([
      detailsPromise,
      streetViewPromise || Promise.resolve(null),
    ]);

    if (!details) {
      return NextResponse.json(
        { error: "Place not found" },
        { status: 404 }
      );
    }

    // Build Google Maps URL for "Open in Google Maps"
    const mapsUrl = lat && lng
      ? `https://www.google.com/maps/@${lat},${lng},18z`
      : details.url || `https://www.google.com/maps/place/?q=place_id:${placeId}`;

    return NextResponse.json({
      details,
      streetView: streetView || { available: false, urls: [] },
      mapsUrl,
    });
  } catch (err) {
    console.error("Place details error:", err);
    return NextResponse.json(
      { error: "Failed to fetch place details" },
      { status: 500 }
    );
  }
}
