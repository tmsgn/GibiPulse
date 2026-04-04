import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const stats = searchParams.get("stats");

    if (stats === "departments") {
      // Per-department aggregate ratings from resolved groups with feedback
      const { data: groups, error } = await supabase
        .from("report_groups")
        .select("assigned_to, satisfaction_rating, satisfaction_count")
        .eq("status", "resolved")
        .not("assigned_to", "is", null)
        .gt("satisfaction_count", 0);

      if (error) throw error;

      const deptMap: Record<string, { total: number; weighted: number; count: number }> = {};
      for (const g of groups ?? []) {
        const dept = g.assigned_to as string;
        if (!deptMap[dept]) deptMap[dept] = { total: 0, weighted: 0, count: 0 };
        deptMap[dept].total += 1;
        deptMap[dept].weighted += (g.satisfaction_rating ?? 0) * (g.satisfaction_count ?? 1);
        deptMap[dept].count += g.satisfaction_count ?? 0;
      }

      const departmentStats = Object.entries(deptMap).map(([dept, vals]) => ({
        department: dept,
        avg_rating: vals.count > 0 ? Math.round((vals.weighted / vals.count) * 10) / 10 : 0,
        rated_count: vals.count,
        resolved_count: vals.total,
      }));

      return NextResponse.json({ departmentStats });
    }

    // Default: return all groups
    const { data: groups, error } = await supabase
      .from("report_groups")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({ groups: groups ?? [] });
  } catch (error) {
    console.error("Fetch groups error:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, status, assigned_to } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Group ID required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    if (status === "resolved") updates.resolved_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("report_groups")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Also update all reports in this group (only when status changed)
    if (status) {
      await supabase
        .from("reports")
        .update({ status })
        .eq("group_id", id);
    }

    return NextResponse.json({ success: true, group: data });
  } catch (error) {
    console.error("Update group error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
