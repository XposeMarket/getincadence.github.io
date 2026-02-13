/**
 * Revenue Radar — Photographer Niche Profiles
 * 
 * Each niche searches different Google Places categories
 * and weights scoring differently.
 */

export type PhotographerNiche =
  | "event_wedding"
  | "portrait_lifestyle"
  | "car_automotive"
  | "street_urban"
  | "content_creator"
  | "real_estate"
  | "general_photo";

export interface PhotoNicheProfile {
  id: PhotographerNiche;
  label: string;
  icon: string;
  description: string;
  /** Google Places keyword queries for this niche */
  searchKeywords: string[];
  /** Which Google Places types are most relevant */
  placeTypes: string[];
  /** Scoring: how much each signal matters (0-1, sum ~1) */
  weights: {
    venueMatch: number;      // is this the right type of location?
    highRating: number;       // well-reviewed = popular/pretty
    photoFriendly: number;    // open space, outdoor, scenic signals
    accessibility: number;    // public access, parking
    distance: number;
  };
  /** Types of venues that score highest for this niche */
  primeVenueTypes: string[];
  /** Reason templates */
  reasonTemplates: {
    venueMatch: string;
    highRating: string;
    photoFriendly: string;
    scenic: string;
  };
}

// ─── Niche Profiles ───────────────────────────────────────────────────────────

const EVENT_WEDDING: PhotoNicheProfile = {
  id: "event_wedding",
  label: "Event & Wedding",
  icon: "Heart",
  description: "Venues, banquet halls, ceremony locations",
  searchKeywords: [
    "wedding venue",
    "event space",
    "banquet hall",
    "garden venue",
    "winery venue",
    "rooftop venue",
    "church wedding",
    "country club",
    "hotel ballroom",
    "barn venue",
  ],
  placeTypes: ["establishment"],
  weights: {
    venueMatch: 0.35,
    highRating: 0.25,
    photoFriendly: 0.15,
    accessibility: 0.10,
    distance: 0.15,
  },
  primeVenueTypes: [
    "wedding", "venue", "banquet", "ballroom", "winery", "vineyard",
    "garden", "estate", "manor", "country club", "barn", "chapel",
    "rooftop", "event space", "reception",
  ],
  reasonTemplates: {
    venueMatch: "Event/wedding venue — high booking potential",
    highRating: "Well-reviewed venue ({rating}/5 • {reviews} reviews)",
    photoFriendly: "Garden/outdoor elements — great natural light",
    scenic: "Scenic location with visual appeal",
  },
};

const PORTRAIT_LIFESTYLE: PhotoNicheProfile = {
  id: "portrait_lifestyle",
  label: "Portrait & Lifestyle",
  icon: "User",
  description: "Parks, gardens, waterfronts, scenic spots",
  searchKeywords: [
    "park",
    "botanical garden",
    "waterfront",
    "scenic overlook",
    "nature preserve",
    "historic district",
    "garden",
    "arboretum",
    "lake",
    "pier",
  ],
  placeTypes: ["park", "establishment"],
  weights: {
    venueMatch: 0.20,
    highRating: 0.20,
    photoFriendly: 0.30,
    accessibility: 0.10,
    distance: 0.20,
  },
  primeVenueTypes: [
    "park", "garden", "botanical", "waterfront", "lake", "pier",
    "overlook", "trail", "nature", "preserve", "arboretum",
    "fountain", "bridge", "historic",
  ],
  reasonTemplates: {
    venueMatch: "Natural setting — ideal for portraits",
    highRating: "Popular spot ({rating}/5 • {reviews} reviews)",
    photoFriendly: "Open space with natural backdrops",
    scenic: "Scenic environment — water/greenery nearby",
  },
};

const CAR_AUTOMOTIVE: PhotoNicheProfile = {
  id: "car_automotive",
  label: "Car & Automotive",
  icon: "Car",
  description: "Industrial zones, open lots, scenic roads, urban backdrops",
  searchKeywords: [
    "parking garage",
    "industrial park",
    "marina",
    "warehouse district",
    "waterfront",
    "scenic highway",
    "empty lot",
    "dock",
    "airport viewing area",
    "race track",
  ],
  placeTypes: ["establishment"],
  weights: {
    venueMatch: 0.25,
    highRating: 0.10,
    photoFriendly: 0.35,
    accessibility: 0.15,
    distance: 0.15,
  },
  primeVenueTypes: [
    "parking", "garage", "industrial", "warehouse", "dock", "marina",
    "pier", "airport", "track", "stadium", "overpass", "bridge",
    "waterfront", "scenic",
  ],
  reasonTemplates: {
    venueMatch: "Industrial/urban backdrop — great for automotive shoots",
    highRating: "Accessible location ({rating}/5)",
    photoFriendly: "Open space for positioning vehicles",
    scenic: "Visual contrast — concrete/metal/water elements",
  },
};

const STREET_URBAN: PhotoNicheProfile = {
  id: "street_urban",
  label: "Street & Urban",
  icon: "Building",
  description: "Architecture, murals, downtown, modern buildings",
  searchKeywords: [
    "art gallery",
    "mural",
    "downtown",
    "modern architecture",
    "museum",
    "city hall",
    "historic building",
    "graffiti art",
    "cultural center",
    "public art",
  ],
  placeTypes: ["establishment"],
  weights: {
    venueMatch: 0.25,
    highRating: 0.15,
    photoFriendly: 0.30,
    accessibility: 0.10,
    distance: 0.20,
  },
  primeVenueTypes: [
    "gallery", "museum", "art", "mural", "cultural", "historic",
    "architecture", "monument", "landmark", "theater", "library",
    "city hall", "courthouse", "station",
  ],
  reasonTemplates: {
    venueMatch: "Urban/architectural interest — street photography potential",
    highRating: "Popular cultural spot ({rating}/5 • {reviews} reviews)",
    photoFriendly: "Interesting textures, lines, and visual depth",
    scenic: "Architectural detail and urban character",
  },
};

const CONTENT_CREATOR: PhotoNicheProfile = {
  id: "content_creator",
  label: "Content Creator",
  icon: "Video",
  description: "Instagrammable spots, trendy cafes, unique spaces",
  searchKeywords: [
    "cafe aesthetic",
    "rooftop bar",
    "mural wall",
    "boutique hotel",
    "trendy restaurant",
    "co-working space",
    "neon sign",
    "skyline viewpoint",
    "instagram spot",
    "unique store",
  ],
  placeTypes: ["establishment"],
  weights: {
    venueMatch: 0.20,
    highRating: 0.30,
    photoFriendly: 0.25,
    accessibility: 0.05,
    distance: 0.20,
  },
  primeVenueTypes: [
    "cafe", "coffee", "rooftop", "boutique", "hotel", "bar",
    "mural", "neon", "aesthetic", "trendy", "brunch", "skyline",
    "viewpoint", "instagrammable",
  ],
  reasonTemplates: {
    venueMatch: "Trendy/aesthetic location — content-friendly",
    highRating: "Popular & highly rated ({rating}/5 • {reviews} reviews)",
    photoFriendly: "Instagrammable aesthetic — great for content",
    scenic: "Unique visual environment for standout content",
  },
};

const REAL_ESTATE: PhotoNicheProfile = {
  id: "real_estate",
  label: "Real Estate",
  icon: "Home",
  description: "Luxury homes, model homes, staging companies",
  searchKeywords: [
    "luxury homes",
    "model home",
    "real estate office",
    "home staging",
    "interior design showroom",
    "new construction homes",
    "open house",
    "real estate developer",
  ],
  placeTypes: ["establishment"],
  weights: {
    venueMatch: 0.30,
    highRating: 0.20,
    photoFriendly: 0.15,
    accessibility: 0.15,
    distance: 0.20,
  },
  primeVenueTypes: [
    "real estate", "luxury", "home", "staging", "interior",
    "developer", "construction", "model",
  ],
  reasonTemplates: {
    venueMatch: "Real estate related — potential client",
    highRating: "Established business ({rating}/5 • {reviews} reviews)",
    photoFriendly: "Property photography opportunity",
    scenic: "Upscale area — premium listing potential",
  },
};

const GENERAL_PHOTO: PhotoNicheProfile = {
  id: "general_photo",
  label: "General",
  icon: "Camera",
  description: "Balanced mix of all location types",
  searchKeywords: [
    "park",
    "event venue",
    "waterfront",
    "art gallery",
    "scenic viewpoint",
    "garden",
    "historic building",
    "cafe",
  ],
  placeTypes: ["establishment"],
  weights: {
    venueMatch: 0.20,
    highRating: 0.25,
    photoFriendly: 0.25,
    accessibility: 0.10,
    distance: 0.20,
  },
  primeVenueTypes: [
    "park", "garden", "venue", "gallery", "waterfront", "scenic",
    "historic", "cafe", "museum",
  ],
  reasonTemplates: {
    venueMatch: "Visually interesting location",
    highRating: "Popular spot ({rating}/5 • {reviews} reviews)",
    photoFriendly: "Good shooting environment",
    scenic: "Scenic location with visual variety",
  },
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const PHOTO_NICHE_PROFILES: Record<PhotographerNiche, PhotoNicheProfile> = {
  event_wedding: EVENT_WEDDING,
  portrait_lifestyle: PORTRAIT_LIFESTYLE,
  car_automotive: CAR_AUTOMOTIVE,
  street_urban: STREET_URBAN,
  content_creator: CONTENT_CREATOR,
  real_estate: REAL_ESTATE,
  general_photo: GENERAL_PHOTO,
};

export function getPhotoNicheProfile(niche: string): PhotoNicheProfile {
  return PHOTO_NICHE_PROFILES[niche as PhotographerNiche] || GENERAL_PHOTO;
}
