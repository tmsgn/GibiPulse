import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeReport } from "@/lib/groq";
import type { SeverityLevel } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { student_id, building, dorm_number, message } = await request.json();

    if (!student_id || !building || !dorm_number || !message) {
      return NextResponse.json(
        { error: "Student ID, Building, Dorm Number, and message are required" },
        { status: 400 }
      );
    }

    // Validate student ID format (7-digit number like 1602534)
    if (!/^\d{5,10}$/.test(student_id.trim())) {
      return NextResponse.json(
        { error: "Invalid student ID. Use your university ID number." },
        { status: 400 }
      );
    }

    if (message.trim().length < 5) {
      return NextResponse.json(
        { error: "Message is too short. Please describe the issue." },
        { status: 400 }
      );
    }

    // Analyze with Groq AI — pass building & dorm as location context
    const analysis = await analyzeReport({
      message: message.trim(),
      building: building.trim(),
      dorm_number: dorm_number.trim(),
    });

    const supabase = await createClient();

    // Smart deduplication: find existing open group with same type + location
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: existingGroup } = await supabase
      .from("report_groups")
      .select("*")
      .eq("issue_type", analysis.issue_type)
      .eq("location", analysis.location)
      .neq("status", "resolved")
      .gte("created_at", thirtyMinsAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let groupId: string;

    if (existingGroup) {
      // Merge into existing group — increment count, update severity if higher
      const severityRank: Record<SeverityLevel, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      const newSeverity: SeverityLevel =
        severityRank[analysis.severity] > severityRank[existingGroup.severity as SeverityLevel]
          ? analysis.severity
          : (existingGroup.severity as SeverityLevel);

      const { data: updatedGroup } = await supabase
        .from("report_groups")
        .update({
          report_count: existingGroup.report_count + 1,
          severity: newSeverity,
        })
        .eq("id", existingGroup.id)
        .select()
        .single();

      groupId = existingGroup.id;
      
      // Insert individual report linked to group
      await supabase.from("reports").insert({
        student_id: student_id.trim(),
        building: building.trim(),
        dorm_number: dorm_number.trim(),
        raw_message: message.trim(),
        issue_type: analysis.issue_type,
        location: analysis.location,
        severity: analysis.severity,
        status: "open",
        ai_summary: analysis.ai_summary,
        group_id: groupId,
        duplicate_count: 0,
      });

      return NextResponse.json({
        success: true,
        analysis,
        merged: true,
        group_count: (updatedGroup?.report_count ?? existingGroup.report_count + 1),
        message: "Your report has been merged with similar active reports.",
      });
    }

    // Create new group
    const { data: newGroup, error: groupError } = await supabase
      .from("report_groups")
      .insert({
        issue_type: analysis.issue_type,
        location: analysis.location,
        severity: analysis.severity,
        status: "open",
        ai_summary: analysis.ai_summary,
        report_count: 1,
        assigned_to: null,
      })
      .select()
      .single();

    if (groupError || !newGroup) {
      throw new Error(groupError?.message ?? "Failed to create report group");
    }

    groupId = newGroup.id;

    // Insert individual report
    const { error: reportError } = await supabase.from("reports").insert({
      student_id: student_id.trim(),
      building: building.trim(),
      dorm_number: dorm_number.trim(),
      raw_message: message.trim(),
      issue_type: analysis.issue_type,
      location: analysis.location,
      severity: analysis.severity,
      status: "open",
      ai_summary: analysis.ai_summary,
      group_id: groupId,
      duplicate_count: 0,
    });

    if (reportError) throw new Error(reportError.message);

    return NextResponse.json({
      success: true,
      analysis,
      merged: false,
      group_count: 1,
      message: "Report submitted successfully.",
    });
  } catch (error) {
    console.error("Report submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit report. Please try again." },
      { status: 500 }
    );
  }
}
