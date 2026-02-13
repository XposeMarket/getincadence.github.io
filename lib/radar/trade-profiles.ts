/**
 * Revenue Radar — Residential Trade Profiles
 * 
 * Same data sources, different scoring weights per trade.
 * Each trade defines which signals matter most and what
 * property age ranges trigger opportunity.
 */

// ─── Trade Type ───────────────────────────────────────────────────────────────

export type ResidentialTrade =
  | "roofing"
  | "hvac"
  | "remodeling"
  | "solar"
  | "siding_windows"
  | "plumbing_electrical"
  | "general";

// ─── Weight Profile ───────────────────────────────────────────────────────────

export interface TradeProfile {
  id: ResidentialTrade;
  label: string;
  icon: string;               // lucide icon name
  description: string;

  // Scoring weights (must sum to ~1.0 for normalization)
  weights: {
    propertyAge: number;       // census median year built
    stormProximity: number;    // NOAA storm events
    permitActivity: number;    // permit signals
    incomeTier: number;        // census median income
    ownerOccupied: number;     // census owner-occupied %
    distance: number;          // proximity to search center
  };

  // Age ranges that trigger signals for this trade
  ageSignals: {
    primeMin: number;          // ideal age range start
    primeMax: number;          // ideal age range end
    extendedMin: number;       // secondary range start
    extendedMax: number;       // secondary range end
    label: string;             // e.g. "Roof replacement window"
  };

  // Income threshold for "high potential"
  incomeMinForHighPotential: number;

  // Trade-specific reason templates
  reasonTemplates: {
    ageInPrime: string;        // e.g. "Roof age in replacement window (15-25yr)"
    ageInExtended: string;
    highIncome: string;
    highOwnership: string;
    stormImpact: string;
    permitCluster: string;
  };
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

const ROOFING: TradeProfile = {
  id: "roofing",
  label: "Roofing",
  icon: "Home",
  description: "Storm damage, aging roofs, replacement cycles",
  weights: {
    propertyAge: 0.28,
    stormProximity: 0.25,
    permitActivity: 0.12,
    incomeTier: 0.12,
    ownerOccupied: 0.10,
    distance: 0.13,
  },
  ageSignals: {
    primeMin: 15, primeMax: 25,
    extendedMin: 12, extendedMax: 30,
    label: "Roof replacement window",
  },
  incomeMinForHighPotential: 65000,
  reasonTemplates: {
    ageInPrime: "Roof age in replacement window ({age}yr)",
    ageInExtended: "Roof approaching service age ({age}yr)",
    highIncome: "Higher income area — premium roof potential",
    highOwnership: "High homeownership ({pct}%) — decision-makers present",
    stormImpact: "Recent storm activity within {dist} mi ({when})",
    permitCluster: "Roofing/building permits active in area",
  },
};

const HVAC: TradeProfile = {
  id: "hvac",
  label: "HVAC",
  icon: "Thermometer",
  description: "System replacements, efficiency upgrades, seasonal",
  weights: {
    propertyAge: 0.30,
    stormProximity: 0.08,
    permitActivity: 0.15,
    incomeTier: 0.18,
    ownerOccupied: 0.12,
    distance: 0.17,
  },
  ageSignals: {
    primeMin: 10, primeMax: 18,
    extendedMin: 8, extendedMax: 25,
    label: "HVAC replacement cycle",
  },
  incomeMinForHighPotential: 60000,
  reasonTemplates: {
    ageInPrime: "HVAC system likely at replacement age ({age}yr)",
    ageInExtended: "HVAC system aging — maintenance opportunity ({age}yr)",
    highIncome: "Higher income area — efficiency upgrade potential",
    highOwnership: "High homeownership ({pct}%) — HVAC investment likely",
    stormImpact: "Storm may have impacted exterior HVAC units ({when})",
    permitCluster: "HVAC/mechanical permits active in area",
  },
};

const REMODELING: TradeProfile = {
  id: "remodeling",
  label: "Remodeling",
  icon: "Hammer",
  description: "Kitchen, bath, whole-home renovations",
  weights: {
    propertyAge: 0.25,
    stormProximity: 0.05,
    permitActivity: 0.20,
    incomeTier: 0.25,
    ownerOccupied: 0.12,
    distance: 0.13,
  },
  ageSignals: {
    primeMin: 25, primeMax: 50,
    extendedMin: 15, extendedMax: 60,
    label: "Renovation-ready age",
  },
  incomeMinForHighPotential: 80000,
  reasonTemplates: {
    ageInPrime: "Home age ideal for renovation ({age}yr)",
    ageInExtended: "Home nearing renovation age ({age}yr)",
    highIncome: "High income area — remodel budget available",
    highOwnership: "High homeownership ({pct}%) — renovation investment likely",
    stormImpact: "Storm damage may trigger renovation decisions ({when})",
    permitCluster: "Remodel/renovation permits active nearby",
  },
};

const SOLAR: TradeProfile = {
  id: "solar",
  label: "Solar",
  icon: "Sun",
  description: "Panel installation, energy savings",
  weights: {
    propertyAge: 0.15,
    stormProximity: 0.03,
    permitActivity: 0.10,
    incomeTier: 0.32,
    ownerOccupied: 0.22,
    distance: 0.18,
  },
  ageSignals: {
    primeMin: 5, primeMax: 25,
    extendedMin: 3, extendedMax: 35,
    label: "Solar-compatible roof age",
  },
  incomeMinForHighPotential: 75000,
  reasonTemplates: {
    ageInPrime: "Roof age ideal for solar install ({age}yr)",
    ageInExtended: "Roof age acceptable for solar ({age}yr)",
    highIncome: "High income — solar ROI attractive",
    highOwnership: "High homeownership ({pct}%) — solar investment decision-makers",
    stormImpact: "Recent storm — potential roof+solar bundle ({when})",
    permitCluster: "Solar/electrical permits trending in area",
  },
};

const SIDING_WINDOWS: TradeProfile = {
  id: "siding_windows",
  label: "Siding & Windows",
  icon: "SquareStack",
  description: "Exterior upgrades, energy efficiency",
  weights: {
    propertyAge: 0.30,
    stormProximity: 0.18,
    permitActivity: 0.10,
    incomeTier: 0.16,
    ownerOccupied: 0.12,
    distance: 0.14,
  },
  ageSignals: {
    primeMin: 20, primeMax: 40,
    extendedMin: 15, extendedMax: 50,
    label: "Siding/window replacement window",
  },
  incomeMinForHighPotential: 65000,
  reasonTemplates: {
    ageInPrime: "Siding/windows likely due for replacement ({age}yr)",
    ageInExtended: "Exterior aging — upgrade opportunity ({age}yr)",
    highIncome: "Income supports exterior upgrade investment",
    highOwnership: "High homeownership ({pct}%) — curb appeal matters",
    stormImpact: "Storm may have damaged exterior surfaces ({when})",
    permitCluster: "Exterior/siding permits active in area",
  },
};

const PLUMBING_ELECTRICAL: TradeProfile = {
  id: "plumbing_electrical",
  label: "Plumbing & Electrical",
  icon: "Wrench",
  description: "Aging infrastructure, code upgrades, panel replacements",
  weights: {
    propertyAge: 0.35,
    stormProximity: 0.05,
    permitActivity: 0.18,
    incomeTier: 0.15,
    ownerOccupied: 0.12,
    distance: 0.15,
  },
  ageSignals: {
    primeMin: 35, primeMax: 60,
    extendedMin: 25, extendedMax: 70,
    label: "Infrastructure upgrade needed",
  },
  incomeMinForHighPotential: 55000,
  reasonTemplates: {
    ageInPrime: "Plumbing/electrical likely outdated ({age}yr)",
    ageInExtended: "Infrastructure aging — proactive maintenance ({age}yr)",
    highIncome: "Income supports infrastructure investment",
    highOwnership: "High homeownership ({pct}%) — maintenance-motivated",
    stormImpact: "Storm may have stressed aging systems ({when})",
    permitCluster: "Plumbing/electrical permits active in area",
  },
};

const GENERAL: TradeProfile = {
  id: "general",
  label: "General Contractor",
  icon: "HardHat",
  description: "Balanced scoring across all home service needs",
  weights: {
    propertyAge: 0.25,
    stormProximity: 0.12,
    permitActivity: 0.15,
    incomeTier: 0.18,
    ownerOccupied: 0.13,
    distance: 0.17,
  },
  ageSignals: {
    primeMin: 15, primeMax: 40,
    extendedMin: 10, extendedMax: 50,
    label: "General service opportunity",
  },
  incomeMinForHighPotential: 60000,
  reasonTemplates: {
    ageInPrime: "Home age in prime service range ({age}yr)",
    ageInExtended: "Home aging — multiple service needs likely ({age}yr)",
    highIncome: "Higher income area — larger project budgets",
    highOwnership: "High homeownership ({pct}%) — invested in property",
    stormImpact: "Recent storm activity nearby ({when})",
    permitCluster: "Building permits active in area",
  },
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const TRADE_PROFILES: Record<ResidentialTrade, TradeProfile> = {
  roofing: ROOFING,
  hvac: HVAC,
  remodeling: REMODELING,
  solar: SOLAR,
  siding_windows: SIDING_WINDOWS,
  plumbing_electrical: PLUMBING_ELECTRICAL,
  general: GENERAL,
};

export function getTradeProfile(trade: string): TradeProfile {
  return TRADE_PROFILES[trade as ResidentialTrade] || GENERAL;
}
