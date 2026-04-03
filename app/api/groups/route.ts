import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

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
