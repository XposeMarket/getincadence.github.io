import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ActivityLogger } from "@/lib/activity-logger";
import { onDealCreated } from "@/lib/automation-engine";

/**
 * POST /api/revenue-radar/create-opportunity
 * 
 * Quick-create a deal (+ optional company) from a Revenue Radar lead.
 * 
 * Body: {
 *   lead: { ... scored lead properties },
 *   industry: string,
 *   trade?: string (for residential)
 * }
 * 
 * Returns: { dealId, companyId?, dealUrl }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();

  // Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("org_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organization found" }, { status: 400 });
  }

  const orgId = profile.org_id;
  const body = await req.json();
  const { lead, industry, trade } = body;

  if (!lead) {
    return NextResponse.json({ error: "No lead data provided" }, { status: 400 });
  }

  // ── Usage limit check ───────────────────────────────────────
  try {
    const { count } = await supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("org_id", orgId)
      .single();

    const isFreePlan = !sub || sub.plan_id === "free";
    if (isFreePlan && (count ?? 0) >= 10) {
      return NextResponse.json(
        { error: "Deal limit reached on free plan (10 active deals). Upgrade to create more." },
        { status: 403 }
      );
    }
  } catch {
    // Non-critical — continue
  }

  // ── Get default pipeline + first stage ──────────────────────
  const { data: pipelines } = await supabase
    .from("pipelines")
    .select("id, name")
    .eq("org_id", orgId)
    .eq("is_default", true)
    .limit(1);

  let pipelineId = pipelines?.[0]?.id;

  if (!pipelineId) {
    const { data: anyPipeline } = await supabase
      .from("pipelines")
      .select("id")
      .eq("org_id", orgId)
      .limit(1);
    pipelineId = anyPipeline?.[0]?.id;
  }

  if (!pipelineId) {
    return NextResponse.json({ error: "No pipeline found. Please create a pipeline first." }, { status: 400 });
  }

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name")
    .eq("pipeline_id", pipelineId)
    .order("position", { ascending: true });

  if (!stages || stages.length === 0) {
    return NextResponse.json({ error: "No stages in pipeline." }, { status: 400 });
  }

  const firstStage = stages[0];

  // ── Industry-specific logic ─────────────────────────────────

  const isResidential = ["residential_service", "roofing", "solar", "hvac"].includes(industry);
  const isPhotographer = industry === "photographer";
  let companyId: string | null = null;
  let dealName = "";
  let dealNotes = "";

  if (isResidential) {
    // ── RESIDENTIAL: no company, deal = address ───────────────
    const addr = lead.address || lead.name || "Residential Lead";
    const city = lead.city || "";
    const state = lead.state || "";
    const tradeLabel = trade
      ? trade.charAt(0).toUpperCase() + trade.slice(1).replace(/_/g, " ")
      : "Service";

    dealName = `${addr}${city ? `, ${city}` : ""}`;

    const notes: string[] = [];
    notes.push(`🎯 Revenue Radar — ${tradeLabel} Opportunity`);
    notes.push(`📍 ${addr}${city ? `, ${city}` : ""}${state ? ` ${state}` : ""}`);
    notes.push(`⭐ Score: ${lead.score}/10 (${lead.trigger || "Opportunity"})`);
    notes.push(`📏 Distance: ${lead.distance} mi from search center`);
    if (lead.propertyAge && lead.propertyAge !== "Unknown")
      notes.push(`🏠 Area Home Age: ${lead.propertyAge}`);
    if (lead.medianYearBuilt && lead.medianYearBuilt !== "Unknown")
      notes.push(`📅 Median Year Built: ${lead.medianYearBuilt}`);
    if (lead.medianIncome && lead.medianIncome !== "Unknown")
      notes.push(`💰 Median Income: ${lead.medianIncome}`);
    if (lead.ownerOccupied && lead.ownerOccupied !== "Unknown")
      notes.push(`🔑 Owner Occupied: ${lead.ownerOccupied}`);
    if (lead.stormProximity && lead.stormProximity !== "None nearby")
      notes.push(`⛈️ Storm: ${lead.stormProximity}`);
    if (lead.permitHistory && lead.permitHistory !== "None nearby")
      notes.push(`📋 Permits: ${lead.permitHistory}`);
    if (lead.nearbyCount > 0)
      notes.push(`🏘️ ${lead.nearbyCount} similar properties within 0.3 mi`);
    if (lead.reasons?.length > 0) {
      notes.push("");
      notes.push("Signal Breakdown:");
      for (const r of lead.reasons) {
        notes.push(`  • ${r}`);
      }
    }
    dealNotes = notes.join("\n");

  } else {
    // ── B2B / COMMERCIAL / RETAIL / PHOTOGRAPHER: create company ──
    const bizName = lead.businessName || lead.venueName || lead.name || "Business Lead";
    dealName = bizName;

    // Check if company already exists
    const { data: existingCompany } = await supabase
      .from("companies")
      .select("id")
      .eq("org_id", orgId)
      .ilike("name", bizName)
      .limit(1);

    if (existingCompany && existingCompany.length > 0) {
      companyId = existingCompany[0].id;
    } else {
      const companyData: Record<string, any> = {
        name: bizName,
        org_id: orgId,
        address: lead.address || null,
        city: lead.city || null,
        state: lead.state || null,
        website: lead.website || null,
        phone: lead.phone || null,
      };
      if (lead.category) companyData.industry = lead.category;

      const { data: newCompany, error: compError } = await supabase
        .from("companies")
        .insert(companyData)
        .select("id")
        .single();

      if (!compError && newCompany) {
        companyId = newCompany.id;
      }
    }

    // Build notes
    const notes: string[] = [];
    notes.push(`🎯 Revenue Radar — Prospected Lead`);
    notes.push(`📍 ${lead.address || "Address unknown"}`);
    notes.push(`⭐ Score: ${lead.score}/10 (${lead.trigger || "Opportunity"})`);
    if (lead.rating) notes.push(`⭐ Rating: ${lead.rating}/5 (${lead.reviewCount || 0} reviews)`);
    if (lead.category) notes.push(`🏢 Category: ${lead.category}`);
    if (lead.distance) notes.push(`📏 Distance: ${lead.distance} mi`);
    if (lead.reasons?.length > 0) {
      notes.push("");
      notes.push("Signal Breakdown:");
      for (const r of lead.reasons) {
        notes.push(`  • ${r}`);
      }
    }
    if (isPhotographer && lead.venueType) {
      notes.push(`📸 Venue Type: ${lead.venueType}`);
    }
    dealNotes = notes.join("\n");
  }

  // ── Create the deal ─────────────────────────────────────────
  const { data: newDeal, error: dealError } = await supabase
    .from("deals")
    .insert({
      name: dealName,
      amount: 0,
      pipeline_id: pipelineId,
      stage_id: firstStage.id,
      company_id: companyId,
      contact_id: null,
      owner_id: user.id,
      description: dealNotes,
      org_id: orgId,
    })
    .select("id")
    .single();

  if (dealError) {
    console.error("Deal creation error:", dealError);
    return NextResponse.json(
      { error: `Failed to create deal: ${dealError.message}` },
      { status: 500 }
    );
  }

  // ── Activity log ────────────────────────────────────────────
  try {
    await ActivityLogger.dealCreated({
      id: newDeal.id,
      name: dealName,
      amount: 0,
      stage_name: firstStage.name,
      company_name: lead.businessName || lead.venueName || undefined,
    });
  } catch { /* non-critical */ }

  // ── Automation trigger ──────────────────────────────────────
  try {
    await onDealCreated({
      dealId: newDeal.id,
      dealName,
      dealAmount: 0,
      stageName: firstStage.name,
      contactId: undefined,
      companyId: companyId || undefined,
      companyName: lead.businessName || lead.venueName || undefined,
    });
  } catch { /* non-critical */ }

  return NextResponse.json({
    success: true,
    dealId: newDeal.id,
    companyId,
    dealName,
    stageName: firstStage.name,
    dealUrl: `/deals/${newDeal.id}`,
  });
}
