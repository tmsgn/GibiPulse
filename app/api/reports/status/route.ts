import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Query reports joined with their groups to get the most up-to-date status
    const { data, error } = await supabase
      .from("reports")
      .select(`
        *,
        report_groups (
          status,
          assigned_to,
          resolved_at,
          ai_summary
        )
      `)
      .eq("student_id", studentId.trim())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching reports:", error);
      throw error;
    }

    // Map the results to flatten the status from the group if available
    const reports = data.map((report: any) => {
      const groupData = report.report_groups;
      return {
        id: report.id,
        ai_summary: report.ai_summary,
        issue_type: report.issue_type,
        location: report.location,
        created_at: report.created_at,
        // Override with group status if joined
        status: groupData ? groupData.status : report.status,
        assigned_to: groupData ? groupData.assigned_to : report.assigned_to,
        resolved_at: groupData ? groupData.resolved_at : report.resolved_at,
      };
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Error in /api/reports/status:", error);
    return NextResponse.json(
      { error: "Failed to fetch report status" },
      { status: 500 }
    );
  }
}
