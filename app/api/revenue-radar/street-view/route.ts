import { NextRequest, NextResponse } from "next/server";
import { hasStreetView, getStreetViewUrls } from "@/lib/radar";

/**
 * GET /api/revenue-radar/street-view?lat=xx&lng=xx
 * 
 * Lightweight endpoint for Street View only (no place details).
 * Used for residential leads that don't have a Google Place ID.
 */
export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 }
    );
  }

  const pLat = parseFloat(lat);
  const pLng = parseFloat(lng);

  try {
    const available = await hasStreetView(pLat, pLng);
    const urls = available ? getStreetViewUrls(pLat, pLng, "400x250") : [];
    const mapsUrl = `https://www.google.com/maps/@${pLat},${pLng},18z`;

    return NextResponse.json({
      streetView: { available, urls },
      mapsUrl,
    });
  } catch (err) {
    console.error("Street view error:", err);
    return NextResponse.json(
      { streetView: { available: false, urls: [] }, mapsUrl: null },
      { status: 200 }
    );
  }
}
