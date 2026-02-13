/**
 * Revenue Radar — US Census Bureau Data Provider
 * 
 * Fetches neighborhood-level demographics by census tract:
 *   - Median year structures built (B25035_001E)
 *   - Median household income (B19013_001E)  
 *   - Owner-occupied housing units (B25003_002E)
 *   - Total occupied housing units (B25003_001E)
 *   - Total housing units (B25001_001E)
 * 
 * Free, no API key required (250,000 calls/day limit).
 * Docs: https://api.census.gov/data.html
 */

const CENSUS_BASE = "https://api.census.gov/data";
const ACS_YEAR = "2022"; // Latest ACS 5-year estimates
const ACS_DATASET = "acs/acs5";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CensusTractData {
  tractId: string;             // Full FIPS: state+county+tract
  state: string;
  county: string;
  tract: string;
  medianYearBuilt: number | null;
  medianIncome: number | null;
  ownerOccupiedPct: number | null;
  totalHousingUnits: number | null;
  estimatedMedianAge: number | null;  // current year - medianYearBuilt
}

export interface AreaCensusData {
  tracts: CensusTractData[];
  areaMedianYearBuilt: number | null;
  areaMedianIncome: number | null;
  areaOwnerOccupiedPct: number | null;
  areaTotalUnits: number;
}

// ─── FIPS Lookup (lat/lng → state + county FIPS) ──────────────────────────────

interface FIPSResult {
  stateFips: string;
  countyFips: string;
  stateName: string;
  countyName: string;
}

/**
 * Use the FCC API to get FIPS codes from coordinates.
 * Free, no key needed.
 */
async function getFIPS(lat: number, lng: number): Promise<FIPSResult | null> {
  try {
    const res = await fetch(
      `https://geo.fcc.gov/api/census/block/find?latitude=${lat}&longitude=${lng}&format=json&showall=false`
    );
    if (!res.ok) return null;

    const data = await res.json();
    const fips = data.Block?.FIPS;
    if (!fips || fips.length < 11) return null;

    return {
      stateFips: fips.substring(0, 2),
      countyFips: fips.substring(2, 5),
      stateName: data.State?.name || "",
      countyName: data.County?.name || "",
    };
  } catch (err) {
    console.error("[Census] FIPS lookup failed:", err);
    return null;
  }
}

/**
 * For a larger radius, we might span multiple counties.
 * Get FIPS for the center + edges to cover all counties in range.
 */
async function getCountiesInRadius(
  lat: number, lng: number, radiusMiles: number,
): Promise<FIPSResult[]> {
  const seen = new Set<string>();
  const results: FIPSResult[] = [];

  // Check center + 4 cardinal points at radius distance
  const degPerMile = 1 / 69; // rough approximation
  const offsets = [
    [0, 0],
    [radiusMiles * degPerMile, 0],
    [-radiusMiles * degPerMile, 0],
    [0, radiusMiles * degPerMile],
    [0, -radiusMiles * degPerMile],
  ];

  const promises = offsets.map(([dLat, dLng]) =>
    getFIPS(lat + dLat, lng + dLng)
  );

  const fipsResults = await Promise.all(promises);
  for (const fips of fipsResults) {
    if (!fips) continue;
    const key = `${fips.stateFips}${fips.countyFips}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(fips);
  }

  return results;
}

// ─── Census API Calls ─────────────────────────────────────────────────────────

/**
 * Fetch census tract data for a specific county.
 * Returns all tracts in that county with housing/income stats.
 */
async function fetchCountyTracts(
  stateFips: string,
  countyFips: string,
): Promise<CensusTractData[]> {
  const variables = [
    "B25035_001E",  // Median year structure built
    "B19013_001E",  // Median household income
    "B25003_001E",  // Total occupied housing units
    "B25003_002E",  // Owner-occupied housing units
    "B25001_001E",  // Total housing units
  ].join(",");

  const url = `${CENSUS_BASE}/${ACS_YEAR}/${ACS_DATASET}?get=${variables}&for=tract:*&in=state:${stateFips}%20county:${countyFips}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[Census] API error ${res.status} for ${stateFips}/${countyFips}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length < 2) return [];

    // First row is headers, rest is data
    const headers = data[0] as string[];
    const currentYear = new Date().getFullYear();

    return data.slice(1).map((row: any[]) => {
      const medYearBuilt = parseNum(row[headers.indexOf("B25035_001E")]);
      const medIncome = parseNum(row[headers.indexOf("B19013_001E")]);
      const totalOccupied = parseNum(row[headers.indexOf("B25003_001E")]);
      const ownerOccupied = parseNum(row[headers.indexOf("B25003_002E")]);
      const totalUnits = parseNum(row[headers.indexOf("B25001_001E")]);
      const state = row[headers.indexOf("state")];
      const county = row[headers.indexOf("county")];
      const tract = row[headers.indexOf("tract")];

      return {
        tractId: `${state}${county}${tract}`,
        state,
        county,
        tract,
        medianYearBuilt: medYearBuilt,
        medianIncome: medIncome,
        ownerOccupiedPct: totalOccupied && ownerOccupied
          ? Math.round((ownerOccupied / totalOccupied) * 100)
          : null,
        totalHousingUnits: totalUnits,
        estimatedMedianAge: medYearBuilt ? currentYear - medYearBuilt : null,
      };
    });
  } catch (err) {
    console.error("[Census] Fetch failed:", err);
    return [];
  }
}

function parseNum(val: any): number | null {
  if (val === null || val === undefined || val === "" || val === "-") return null;
  const n = Number(val);
  return isNaN(n) || n < 0 ? null : n;
}

// ─── Main: Get Census Data for Search Area ────────────────────────────────────

export async function getCensusData(
  lat: number,
  lng: number,
  radiusMiles: number,
): Promise<AreaCensusData> {
  // 1. Find which counties overlap our search area
  const counties = await getCountiesInRadius(lat, lng, radiusMiles);

  if (counties.length === 0) {
    console.error("[Census] No counties found for", lat, lng);
    return { tracts: [], areaMedianYearBuilt: null, areaMedianIncome: null, areaOwnerOccupiedPct: null, areaTotalUnits: 0 };
  }

  // 2. Fetch tract data for each county
  const allTracts: CensusTractData[] = [];
  for (const county of counties) {
    const tracts = await fetchCountyTracts(county.stateFips, county.countyFips);
    allTracts.push(...tracts);
  }

  // 3. Compute area-wide averages (weighted by housing units)
  let totalUnits = 0;
  let weightedYear = 0;
  let weightedIncome = 0;
  let totalOwnerOccupied = 0;
  let totalOccupied = 0;

  for (const t of allTracts) {
    const units = t.totalHousingUnits || 0;
    totalUnits += units;

    if (t.medianYearBuilt && units > 0) {
      weightedYear += t.medianYearBuilt * units;
    }
    if (t.medianIncome && units > 0) {
      weightedIncome += t.medianIncome * units;
    }
    if (t.ownerOccupiedPct !== null && units > 0) {
      totalOwnerOccupied += (t.ownerOccupiedPct / 100) * units;
      totalOccupied += units;
    }
  }

  return {
    tracts: allTracts,
    areaMedianYearBuilt: totalUnits > 0 ? Math.round(weightedYear / totalUnits) : null,
    areaMedianIncome: totalUnits > 0 ? Math.round(weightedIncome / totalUnits) : null,
    areaOwnerOccupiedPct: totalOccupied > 0 ? Math.round((totalOwnerOccupied / totalOccupied) * 100) : null,
    areaTotalUnits: totalUnits,
  };
}

/**
 * Find the census tract that best matches a given lat/lng.
 * Since we don't have tract boundaries (would need TIGER shapefiles),
 * we use the FCC block API which returns the exact tract.
 */
export async function getTractForPoint(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://geo.fcc.gov/api/census/block/find?latitude=${lat}&longitude=${lng}&format=json&showall=false`
    );
    if (!res.ok) return null;

    const data = await res.json();
    const fips = data.Block?.FIPS;
    if (!fips || fips.length < 11) return null;

    // Tract is chars 0-10 (state 2 + county 3 + tract 6)
    return fips.substring(0, 11);
  } catch {
    return null;
  }
}

/**
 * Batch get tract IDs for multiple points.
 * Uses parallel requests with batching.
 */
export async function batchGetTracts(
  points: { lat: number; lng: number }[],
  maxCalls: number = 30,
): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  
  // Sample evenly distributed points
  const step = Math.max(1, Math.floor(points.length / maxCalls));
  const indices: number[] = [];
  for (let i = 0; i < points.length && indices.length < maxCalls; i += step) {
    indices.push(i);
  }

  const BATCH = 5;
  for (let b = 0; b < indices.length; b += BATCH) {
    const batch = indices.slice(b, b + BATCH);
    const promises = batch.map(async (idx) => {
      const tractId = await getTractForPoint(points[idx].lat, points[idx].lng);
      if (tractId) results.set(idx, tractId);
    });
    await Promise.all(promises);
    if (b + BATCH < indices.length) {
      await new Promise((r) => setTimeout(r, 30));
    }
  }

  // Assign unresolved points to nearest resolved tract
  const resolved = Array.from(results.entries());
  for (let i = 0; i < points.length; i++) {
    if (results.has(i)) continue;
    let nearest = resolved[0];
    let minD = Infinity;
    for (const [idx, tractId] of resolved) {
      const d = (points[i].lat - points[idx].lat) ** 2 + (points[i].lng - points[idx].lng) ** 2;
      if (d < minD) { minD = d; nearest = [idx, tractId]; }
    }
    if (nearest) results.set(i, nearest[1]);
  }

  return results;
}
