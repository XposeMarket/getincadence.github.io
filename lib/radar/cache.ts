/**
 * Revenue Radar — Cache & Rate Limiting
 * 
 * Supabase-backed cache with lat/lng bucketing.
 * Rate limits: 25 searches/day per org.
 */

import { createAdminClient } from "@/lib/supabase/server";

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_TTL_HOURS = 6;
const DAILY_SEARCH_LIMIT = 25;

// ─── Cache Key Generation ─────────────────────────────────────────────────────

/**
 * Bucket lat/lng to 2 decimal places (~1.1km grid).
 * This means searches within ~1km of each other share cache.
 */
export function makeCacheKey(
  lat: number,
  lng: number,
  industry: string,
  radiusMiles: number,
): string {
  const latBucket = Math.round(lat * 100) / 100;
  const lngBucket = Math.round(lng * 100) / 100;
  const radiusBucket = Math.round(radiusMiles / 5) * 5;
  // v5: photographer niche scoring + street view
  return `v5:${latBucket}:${lngBucket}:${industry}:${radiusBucket}`;
}

// ─── Cache Operations ─────────────────────────────────────────────────────────

export interface CachedResult {
  leads: any;       // GeoJSON FeatureCollection
  storms: any;
  permits: any;
  meta: any;
}

export async function getCachedResult(cacheKey: string): Promise<CachedResult | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("radar_cache")
      .select("leads, storms, permits, meta")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !data) return null;

    return {
      leads: data.leads,
      storms: data.storms,
      permits: data.permits,
      meta: data.meta,
    };
  } catch {
    return null;
  }
}

export async function setCachedResult(
  cacheKey: string,
  lat: number,
  lng: number,
  industry: string,
  radiusMiles: number,
  result: CachedResult,
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const latBucket = Math.round(lat * 100) / 100;
    const lngBucket = Math.round(lng * 100) / 100;

    const expiresAt = new Date(
      Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000
    ).toISOString();

    await supabase
      .from("radar_cache")
      .upsert(
        {
          cache_key: cacheKey,
          industry,
          lat_bucket: latBucket,
          lng_bucket: lngBucket,
          radius_miles: Math.round(radiusMiles),
          leads: result.leads,
          storms: result.storms,
          permits: result.permits,
          meta: result.meta,
          result_count: result.leads?.features?.length || 0,
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
        },
        { onConflict: "cache_key" }
      );
  } catch (err) {
    console.error("Cache write failed:", err);
  }
}

/**
 * Clean up expired cache entries. Call periodically.
 */
export async function cleanExpiredCache(): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase
      .from("radar_cache")
      .delete()
      .lt("expires_at", new Date().toISOString());
  } catch {
    // Non-critical
  }
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string;            // midnight UTC of next day
}

export async function checkRateLimit(orgId: string): Promise<RateLimitResult> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Tomorrow midnight for reset time
  const tomorrow = new Date();
  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  try {
    // Get or create today's record
    const { data: existing } = await supabase
      .from("radar_rate_limits")
      .select("search_count")
      .eq("org_id", orgId)
      .eq("search_date", today)
      .single();

    const currentCount = existing?.search_count || 0;
    const allowed = currentCount < DAILY_SEARCH_LIMIT;
    const remaining = Math.max(0, DAILY_SEARCH_LIMIT - currentCount);

    return {
      allowed,
      remaining,
      limit: DAILY_SEARCH_LIMIT,
      resetAt: tomorrow.toISOString(),
    };
  } catch {
    // If table doesn't exist yet, allow
    return {
      allowed: true,
      remaining: DAILY_SEARCH_LIMIT,
      limit: DAILY_SEARCH_LIMIT,
      resetAt: tomorrow.toISOString(),
    };
  }
}

export async function incrementSearchCount(orgId: string): Promise<void> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  try {
    // Upsert: create if not exists, increment if exists
    const { data: existing } = await supabase
      .from("radar_rate_limits")
      .select("search_count")
      .eq("org_id", orgId)
      .eq("search_date", today)
      .single();

    if (existing) {
      await supabase
        .from("radar_rate_limits")
        .update({
          search_count: existing.search_count + 1,
          last_search_at: new Date().toISOString(),
        })
        .eq("org_id", orgId)
        .eq("search_date", today);
    } else {
      await supabase
        .from("radar_rate_limits")
        .insert({
          org_id: orgId,
          search_date: today,
          search_count: 1,
          last_search_at: new Date().toISOString(),
        });
    }
  } catch (err) {
    console.error("Rate limit increment failed:", err);
  }
}
