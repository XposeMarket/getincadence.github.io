/**
 * Revenue Radar — Module Index
 */

export { searchPlaces, searchPlacesWithKeywords, getPlaceDetails, milesToMeters, distanceBetween, hasStreetView, getStreetViewUrls } from "./google-places";
export type { PlacesResult, PlaceDetails } from "./google-places";

export { reverseGeocode, batchReverseGeocode } from "./geocoding";
export type { GeocodedAddress } from "./geocoding";

export { getStormData } from "./noaa-storms";
export type { StormEvent } from "./noaa-storms";

export { getCensusData, batchGetTracts } from "./census";
export type { CensusTractData, AreaCensusData } from "./census";

export { TRADE_PROFILES, getTradeProfile } from "./trade-profiles";
export type { ResidentialTrade, TradeProfile } from "./trade-profiles";

export { PHOTO_NICHE_PROFILES, getPhotoNicheProfile } from "./photo-niches";
export type { PhotographerNiche, PhotoNicheProfile } from "./photo-niches";

export {
  scorePlacesResult,
  scoreResidentialLead,
  scorePhotographerLead,
  leadsToGeoJSON,
} from "./scoring-engine";
export type { ScoredLead } from "./scoring-engine";

export { clusterLeads, clustersToGeoJSON, clusterLeadsToGeoJSON } from "./clustering";
export type { NeighborhoodCluster } from "./clustering";

export {
  makeCacheKey,
  getCachedResult,
  setCachedResult,
  cleanExpiredCache,
  checkRateLimit,
  incrementSearchCount,
} from "./cache";
