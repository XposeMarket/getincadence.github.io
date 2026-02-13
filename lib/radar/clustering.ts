/**
 * Revenue Radar — Neighborhood Clustering
 * 
 * Groups nearby residential leads into neighborhood clusters.
 * Each cluster gets aggregate stats:
 *   - Average property age
 *   - Property count
 *   - Storm exposure %
 *   - Permit activity %
 *   - Overall cluster score
 * 
 * Uses simple grid-based spatial clustering (~0.5mi cells).
 */

import type { ScoredLead } from "./scoring-engine";
import type { StormEvent } from "./noaa-storms";
import { distanceBetween } from "./google-places";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NeighborhoodCluster {
  id: string;
  lat: number;
  lng: number;
  name: string;
  propertyCount: number;
  avgScore: number;
  avgPropertyAge: number;
  avgMedianIncome: number;     // in thousands
  avgOwnerOccupiedPct: number;
  stormExposurePct: number;
  permitActivityPct: number;
  topReasons: string[];
  leads: ScoredLead[];
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}

// ─── Grid-Based Clustering ────────────────────────────────────────────────────

const CELL_SIZE_DEGREES = 0.007; // ~0.5mi / ~800m per cell

function getCellKey(lat: number, lng: number): string {
  const cellLat = Math.floor(lat / CELL_SIZE_DEGREES);
  const cellLng = Math.floor(lng / CELL_SIZE_DEGREES);
  return `${cellLat}:${cellLng}`;
}

export function clusterLeads(
  leads: ScoredLead[],
  minClusterSize: number = 3,
): { clusters: NeighborhoodCluster[]; singles: ScoredLead[] } {
  // Group leads into grid cells
  const cells = new Map<string, ScoredLead[]>();

  for (const lead of leads) {
    const key = getCellKey(lead.lat, lead.lng);
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key)!.push(lead);
  }

  // Merge adjacent cells that each have <minClusterSize into their nearest neighbor
  // Then build clusters from cells with enough leads
  const clusters: NeighborhoodCluster[] = [];
  const singles: ScoredLead[] = [];
  let clusterIdx = 0;

  // First pass: identify which cells qualify as clusters
  const clusterCells: ScoredLead[][] = [];
  const remainingLeads: ScoredLead[] = [];

  for (const [_, cellLeads] of cells) {
    if (cellLeads.length >= minClusterSize) {
      clusterCells.push(cellLeads);
    } else {
      remainingLeads.push(...cellLeads);
    }
  }

  // Try to merge remaining leads into nearest cluster
  for (const lead of remainingLeads) {
    let merged = false;
    let bestDist = Infinity;
    let bestCluster: ScoredLead[] | null = null;

    for (const cell of clusterCells) {
      const centroid = getCentroid(cell);
      const d = distanceBetween(lead.lat, lead.lng, centroid.lat, centroid.lng);
      if (d < 1500 && d < bestDist) { // within ~1mi
        bestDist = d;
        bestCluster = cell;
        merged = true;
      }
    }

    if (merged && bestCluster) {
      bestCluster.push(lead);
    } else {
      singles.push(lead);
    }
  }

  // Build cluster objects
  for (const cellLeads of clusterCells) {
    const centroid = getCentroid(cellLeads);
    const bounds = getBounds(cellLeads);

    // Aggregate stats
    const ages = cellLeads
      .map(l => parseInt(String(l.propertyAge).replace(/[^0-9]/g, "")) || 0)
      .filter(a => a > 0);
    const avgAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;

    const stormCount = cellLeads.filter(l => l.hasStorm).length;
    const permitCount = cellLeads.filter(l => l.hasPermit).length;
    const avgScore = +(cellLeads.reduce((s, l) => s + l.score, 0) / cellLeads.length).toFixed(1);

    // Census-powered aggregate stats
    const incomes = cellLeads
      .map(l => l.medianIncome ? parseInt(String(l.medianIncome).replace(/[^0-9]/g, "")) : 0)
      .filter(i => i > 0);
    const avgIncome = incomes.length > 0 ? Math.round(incomes.reduce((a, b) => a + b, 0) / incomes.length) : 0;
    const ownerPcts = cellLeads
      .map(l => l.ownerOccupied ? parseInt(String(l.ownerOccupied).replace(/[^0-9]/g, "")) : 0)
      .filter(o => o > 0);
    const avgOwnerPct = ownerPcts.length > 0 ? Math.round(ownerPcts.reduce((a, b) => a + b, 0) / ownerPcts.length) : 0;

    // Build top reasons
    const reasons: string[] = [];
    if (avgAge > 0) reasons.push(`Avg home age in area: ~${avgAge} years`);
    if (avgIncome > 0) reasons.push(`Median income: ~${avgIncome}k`);
    if (avgOwnerPct > 0) reasons.push(`Owner-occupied: ~${avgOwnerPct}%`);
    if (stormCount > 0) reasons.push(`${stormCount} of ${cellLeads.length} properties near recent storm activity`);
    if (permitCount > 0) reasons.push(`${permitCount} properties with permit signals`);
    reasons.push(`${cellLeads.length} properties in this neighborhood`);

    // Use the first geocoded city/street as the name
    const namedLead = cellLeads.find(l => l.city && l.city !== "");
    const neighborhoodName = namedLead
      ? `${namedLead.city || ""} area`
      : `Cluster ${clusterIdx + 1}`;

    clusters.push({
      id: `cluster-${clusterIdx}`,
      lat: centroid.lat,
      lng: centroid.lng,
      name: neighborhoodName,
      propertyCount: cellLeads.length,
      avgScore,
      avgPropertyAge: avgAge,
      avgMedianIncome: avgIncome,
      avgOwnerOccupiedPct: avgOwnerPct,
      stormExposurePct: Math.round((stormCount / cellLeads.length) * 100),
      permitActivityPct: Math.round((permitCount / cellLeads.length) * 100),
      topReasons: reasons,
      leads: cellLeads.sort((a, b) => b.score - a.score),
      bounds,
    });

    clusterIdx++;
  }

  // Sort clusters by score
  clusters.sort((a, b) => b.avgScore - a.avgScore);

  return { clusters, singles };
}

// ─── Cluster → GeoJSON (for map polygons) ─────────────────────────────────────

export function clustersToGeoJSON(clusters: NeighborhoodCluster[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: clusters.map((c) => {
      // Build a convex-hull-like polygon from the bounds with some padding
      const pad = CELL_SIZE_DEGREES * 0.3;
      const { minLat, maxLat, minLng, maxLng } = c.bounds;

      return {
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [[
            [minLng - pad, minLat - pad],
            [maxLng + pad, minLat - pad],
            [maxLng + pad, maxLat + pad],
            [minLng - pad, maxLat + pad],
            [minLng - pad, minLat - pad],
          ]],
        },
        properties: {
          id: c.id,
          name: c.name,
          propertyCount: c.propertyCount,
          avgScore: c.avgScore,
          avgPropertyAge: c.avgPropertyAge,
          stormExposurePct: c.stormExposurePct,
          permitActivityPct: c.permitActivityPct,
          label: `${c.name} • ${c.propertyCount} properties • avg ${c.avgPropertyAge}yr`,
          medianIncome: c.avgMedianIncome > 0 ? `${c.avgMedianIncome}k` : null,
          ownerOccupiedPct: c.avgOwnerOccupiedPct > 0 ? c.avgOwnerOccupiedPct : null,
          type: "neighborhood",
        },
      };
    }),
  };
}

// ─── Cluster leads → GeoJSON (individual points still shown) ──────────────────

export function clusterLeadsToGeoJSON(
  clusters: NeighborhoodCluster[],
  singles: ScoredLead[],
): GeoJSON.FeatureCollection {
  const features: any[] = [];

  // Add cluster centroid markers
  for (const c of clusters) {
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [c.lng, c.lat] },
      properties: {
        id: c.id,
        name: c.name,
        score: c.avgScore,
        type: "Neighborhood",
        trigger: `${c.propertyCount} properties`,
        distance: 0,
        isCluster: true,
        propertyCount: c.propertyCount,
        avgPropertyAge: c.avgPropertyAge,
        stormExposurePct: c.stormExposurePct,
        permitActivityPct: c.permitActivityPct,
        reasons: c.topReasons,
        industry: "residential_service",
      },
    });

    // Also include individual leads
    for (const lead of c.leads) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lead.lng, lead.lat] },
        properties: {
          ...lead,
          clusterId: c.id,
          clusterName: c.name,
        },
      });
    }
  }

  // Add unclustered singles
  for (const lead of singles) {
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lead.lng, lead.lat] },
      properties: lead,
    });
  }

  return { type: "FeatureCollection", features };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCentroid(leads: ScoredLead[]): { lat: number; lng: number } {
  const lat = leads.reduce((s, l) => s + l.lat, 0) / leads.length;
  const lng = leads.reduce((s, l) => s + l.lng, 0) / leads.length;
  return { lat, lng };
}

function getBounds(leads: ScoredLead[]) {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const l of leads) {
    if (l.lat < minLat) minLat = l.lat;
    if (l.lat > maxLat) maxLat = l.lat;
    if (l.lng < minLng) minLng = l.lng;
    if (l.lng > maxLng) maxLng = l.lng;
  }
  return { minLat, maxLat, minLng, maxLng };
}
