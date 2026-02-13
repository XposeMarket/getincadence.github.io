/**
 * Revenue Radar — NOAA Storm Data Provider
 * 
 * Fetches severe weather events from:
 * 1. NWS Alerts API — active warnings/watches with polygons
 * 2. SPC Storm Reports — past 7 days of hail, wind, and tornado reports
 * 
 * All free, no API key required.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StormEvent {
  id: string;
  type: 'hail' | 'wind' | 'tornado' | 'thunderstorm';
  lat: number;
  lng: number;
  radiusMeters: number;
  severity: 'minor' | 'moderate' | 'severe';
  label: string;
  date: string;
  daysAgo: number;
  magnitude?: string;
  source: string;
}

export interface StormPolygon {
  type: 'Feature';
  geometry: { type: 'Polygon'; coordinates: number[][][] };
  properties: {
    id: string;
    label: string;
    severity: string;
    type: string;
    date: string;
    daysAgo: number;
  };
}

// ─── NWS Alerts API ───────────────────────────────────────────────────────────

const NWS_ALERTS_URL = "https://api.weather.gov/alerts";
const NWS_HEADERS = {
  "User-Agent": "(Cadence CRM, support@cadence.app)",
  "Accept": "application/geo+json",
};

interface NWSAlert {
  id: string;
  properties: {
    event: string;
    headline?: string;
    severity: string;
    effective: string;
    expires: string;
    areaDesc: string;
  };
  geometry?: { type: string; coordinates: number[][][] };
}

async function fetchNWSAlerts(lat: number, lng: number): Promise<NWSAlert[]> {
  try {
    // Look up the point's state for broader alert coverage
    const pointRes = await fetch(
      `https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`,
      { headers: NWS_HEADERS }
    );
    if (!pointRes.ok) return [];

    const pointData = await pointRes.json();
    const state = pointData.properties?.relativeLocation?.properties?.state;
    if (!state) return [];

    // Fetch active alerts for this state
    const alertRes = await fetch(
      `${NWS_ALERTS_URL}/active?area=${state}&limit=50`,
      { headers: NWS_HEADERS }
    );
    if (!alertRes.ok) return [];

    const alertData = await alertRes.json();
    return (alertData.features || []) as NWSAlert[];
  } catch (err) {
    console.error("NWS fetch failed:", err);
    return [];
  }
}

// ─── SPC Storm Reports (past 7 days) ─────────────────────────────────────────

const SPC_BASE = "https://www.spc.noaa.gov/climo/reports";

interface SPCReport {
  time: string;
  lat: number;
  lng: number;
  magnitude: string;
  location: string;
  county: string;
  state: string;
  type: 'hail' | 'wind' | 'tornado';
  daysAgo: number;
  dateStr: string;
}

function parseSPCCSV(text: string, type: 'hail' | 'wind' | 'tornado', daysAgo: number, dateStr: string): SPCReport[] {
  const reports: SPCReport[] = [];
  const lines = text.split("\n").slice(1); // skip header

  for (const line of lines) {
    const parts = line.split(",");
    if (parts.length < 7) continue;

    const lat = parseFloat(parts[5]);
    const lng = parseFloat(parts[6]);
    if (isNaN(lat) || isNaN(lng)) continue;

    reports.push({
      time: parts[0]?.trim(),
      magnitude: parts[1]?.trim() || "UNK",
      location: parts[2]?.trim() || "",
      county: parts[3]?.trim() || "",
      state: parts[4]?.trim() || "",
      lat,
      lng: -Math.abs(lng), // SPC uses positive-west
      type,
      daysAgo,
      dateStr,
    });
  }
  return reports;
}

async function fetchSPCReports(): Promise<SPCReport[]> {
  const allReports: SPCReport[] = [];

  // SPC file naming:
  // today: today_hail.csv, today_wind.csv, today_torn.csv
  // yesterday: yesterday_hail.csv, etc.
  // older: YYMMDD_rpts_hail.csv (filteredcsv format varies)
  // We'll grab today + yesterday + last 5 days via the filtered reports

  const reportTypes: { suffix: string; type: 'hail' | 'wind' | 'tornado' }[] = [
    { suffix: "hail", type: "hail" },
    { suffix: "wind", type: "wind" },
    { suffix: "torn", type: "tornado" },
  ];

  // Today and yesterday
  for (const rt of reportTypes) {
    for (const [dayLabel, daysAgo] of [["today", 0], ["yesterday", 1]] as const) {
      try {
        const url = `${SPC_BASE}/${dayLabel}_${rt.suffix}.csv`;
        const res = await fetch(url, { headers: { "User-Agent": "(Cadence CRM)" } });
        if (res.ok) {
          const text = await res.text();
          const dateStr = daysAgo === 0 ? "today" : "yesterday";
          allReports.push(...parseSPCCSV(text, rt.type, daysAgo, dateStr));
        }
      } catch { /* continue */ }
    }
  }

  // Past 2-7 days via SPC filtered reports
  // Format: YYMMDD_rpts_filtered_hail.csv
  for (let daysAgo = 2; daysAgo <= 7; daysAgo++) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateStr = `${mm}/${dd}`;

    for (const rt of reportTypes) {
      try {
        const url = `${SPC_BASE}/${yy}${mm}${dd}_rpts_filtered_${rt.suffix}.csv`;
        const res = await fetch(url, { headers: { "User-Agent": "(Cadence CRM)" } });
        if (res.ok) {
          const text = await res.text();
          allReports.push(...parseSPCCSV(text, rt.type, daysAgo, dateStr));
        }
      } catch { /* continue */ }
    }

    // Small delay between days
    await new Promise((r) => setTimeout(r, 50));
  }

  return allReports;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapNWSSeverity(s: string): string {
  if (s === "Extreme" || s === "Severe") return "severe";
  if (s === "Moderate") return "moderate";
  return "minor";
}

function mapEventType(event: string): string {
  const l = event.toLowerCase();
  if (l.includes("hail")) return "hail";
  if (l.includes("tornado")) return "tornado";
  if (l.includes("wind")) return "wind";
  return "thunderstorm";
}

function makeCirclePolygon(
  cLng: number, cLat: number, radiusM: number,
  steps = 48, jitter = 0.06,
): number[][] {
  const pts: number[][] = [];
  const latRad = cLat * Math.PI / 180;
  const mLat = 111132.92 - 559.82 * Math.cos(2 * latRad);
  const mLng = 111412.84 * Math.cos(latRad);
  let seed = Math.abs(Math.floor(cLat * 10000 + cLng * 10000));
  const pr = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const j = 1 + (pr() - 0.5) * jitter;
    pts.push([cLng + (radiusM * j * Math.cos(a)) / mLng, cLat + (radiusM * j * Math.sin(a)) / mLat]);
  }
  return pts;
}

function distMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ─── Build Output ─────────────────────────────────────────────────────────────

function spcToPolygon(report: SPCReport, idx: number): StormPolygon {
  const mag = parseFloat(report.magnitude) || 1.0;
  let impactR = 3000; // default 3km
  if (report.type === "hail") impactR = Math.min(8000, 2000 + mag * 3000);
  else if (report.type === "tornado") impactR = Math.min(12000, 3000 + mag * 2000);
  else if (report.type === "wind") impactR = Math.min(6000, 2000 + mag * 30);

  const typeLabel = report.type === "hail" ? `${report.magnitude}in hail`
    : report.type === "tornado" ? `EF${Math.min(5, Math.floor(mag / 20))} tornado`
    : `${report.magnitude}mph wind`;

  const when = report.daysAgo === 0 ? "today"
    : report.daysAgo === 1 ? "yesterday"
    : `${report.daysAgo}d ago`;

  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [makeCirclePolygon(report.lng, report.lat, impactR)] },
    properties: {
      id: `spc-${report.type}-${idx}`,
      label: `${typeLabel} • ${report.location}, ${report.state} • ${when}`,
      severity: report.type === "tornado" ? "severe"
        : (report.type === "hail" && mag >= 2.0) ? "severe"
        : mag >= 1.0 ? "moderate" : "minor",
      type: report.type,
      date: new Date(Date.now() - report.daysAgo * 86400000).toISOString(),
      daysAgo: report.daysAgo,
    },
  };
}

function alertToPolygon(alert: NWSAlert): StormPolygon | null {
  if (!alert.geometry?.coordinates?.length) return null;
  const daysAgo = Math.floor((Date.now() - new Date(alert.properties.effective).getTime()) / 86400000);
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: alert.geometry.coordinates },
    properties: {
      id: alert.id,
      label: `${alert.properties.event} • ${daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`}`,
      severity: mapNWSSeverity(alert.properties.severity),
      type: mapEventType(alert.properties.event),
      date: alert.properties.effective,
      daysAgo,
    },
  };
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function getStormData(
  lat: number, lng: number, radiusMiles: number,
): Promise<{ storms: GeoJSON.FeatureCollection; stormEvents: StormEvent[] }> {
  const radiusM = radiusMiles * 1609.344;
  const polygons: StormPolygon[] = [];
  const events: StormEvent[] = [];

  // 1. NWS active alerts (real polygons)
  const alerts = await fetchNWSAlerts(lat, lng);
  for (const alert of alerts) {
    const ev = alert.properties.event.toLowerCase();
    if (ev.includes("hail") || ev.includes("tornado") || ev.includes("thunder") ||
        ev.includes("wind") || ev.includes("severe")) {
      const poly = alertToPolygon(alert);
      if (poly) polygons.push(poly);

      const daysAgo = Math.floor((Date.now() - new Date(alert.properties.effective).getTime()) / 86400000);
      events.push({
        id: alert.id,
        type: mapEventType(alert.properties.event) as StormEvent["type"],
        lat, lng,
        radiusMeters: radiusM * 0.3,
        severity: mapNWSSeverity(alert.properties.severity) as StormEvent["severity"],
        label: alert.properties.headline || alert.properties.event,
        date: alert.properties.effective,
        daysAgo,
        source: "NWS",
      });
    }
  }

  // 2. SPC reports — past 7 days of hail, wind, tornado
  const reports = await fetchSPCReports();

  for (let i = 0; i < reports.length; i++) {
    const r = reports[i];
    const dist = distMeters(lat, lng, r.lat, r.lng);
    if (dist > radiusM) continue;

    polygons.push(spcToPolygon(r, i));

    const mag = parseFloat(r.magnitude) || 0;
    const typeLabel = r.type === "hail" ? `${r.magnitude}in hail`
      : r.type === "tornado" ? "Tornado"
      : `${r.magnitude}mph wind`;

    events.push({
      id: `spc-${r.type}-${i}`,
      type: r.type,
      lat: r.lat,
      lng: r.lng,
      radiusMeters: 3000,
      severity: r.type === "tornado" ? "severe"
        : (r.type === "hail" && mag >= 2.0) ? "severe"
        : "moderate",
      label: `${typeLabel} • ${r.location}, ${r.state}`,
      date: new Date(Date.now() - r.daysAgo * 86400000).toISOString(),
      daysAgo: r.daysAgo,
      magnitude: r.magnitude,
      source: "SPC",
    });
  }

  return {
    storms: { type: "FeatureCollection", features: polygons as any[] },
    stormEvents: events,
  };
}
