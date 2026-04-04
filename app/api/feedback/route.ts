import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const REOPEN_THRESHOLD = 3;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const body = await request.json();
    const { group_id, student_id, rating, comment, is_not_fixed } = body;

    // --- Validate inputs ---
    if (!group_id || typeof group_id !== "string") {
      return NextResponse.json({ error: "group_id is required" }, { status: 400 });
    }
    if (!student_id || typeof student_id !== "string" || student_id.trim().length === 0) {
      return NextResponse.json({ error: "student_id is required" }, { status: 400 });
    }
    if (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json({ error: "rating must be an integer between 1 and 5" }, { status: 400 });
    }

    // --- Fetch the group and verify it is resolved ---
    const { data: group, error: groupError } = await supabase
      .from("report_groups")
      .select("id, status, satisfaction_rating, satisfaction_count, reopen_count, feedback_locked")
      .eq("id", group_id)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    if (group.status !== "resolved") {
      return NextResponse.json({ error: "Feedback can only be submitted for resolved issues" }, { status: 400 });
    }
    if (group.feedback_locked) {
      return NextResponse.json({ error: "Feedback is locked for this group" }, { status: 400 });
    }

    // --- Insert feedback (unique constraint prevents duplicates) ---
    const { error: insertError } = await supabase.from("group_feedback").insert({
      group_id,
      student_id: student_id.trim(),
      rating,
      comment: comment?.trim() || null,
      is_not_fixed: Boolean(is_not_fixed),
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "You have already submitted feedback for this issue" }, { status: 409 });
      }
      throw insertError;
    }

    // --- Recompute average rating ---
    const newCount = (group.satisfaction_count ?? 0) + 1;
    const prevTotal = (group.satisfaction_rating ?? 0) * (group.satisfaction_count ?? 0);
    const newAvg = (prevTotal + rating) / newCount;

    const groupUpdates: Record<string, unknown> = {
      satisfaction_rating: Math.round(newAvg * 100) / 100,
      satisfaction_count: newCount,
    };

    if (comment?.trim()) {
      groupUpdates.rating_comment = comment.trim();
    }

    // --- Handle "Not Fixed" auto-reopen logic ---
    let autoReopened = false;
    if (is_not_fixed) {
      const newReopenCount = (group.reopen_count ?? 0) + 1;
      groupUpdates.reopen_count = newReopenCount;

      if (newReopenCount >= REOPEN_THRESHOLD) {
        // Count actual "not fixed" votes to be safe
        const { count } = await supabase
          .from("group_feedback")
          .select("id", { count: "exact", head: true })
          .eq("group_id", group_id)
          .eq("is_not_fixed", true);

        if ((count ?? 0) >= REOPEN_THRESHOLD) {
          groupUpdates.status = "open";
          groupUpdates.resolved_at = null;
          autoReopened = true;

          // Also reopen all individual reports in this group
          await supabase.from("reports").update({ status: "open" }).eq("group_id", group_id);
        }
      }
    }

    // --- Save group updates ---
    await supabase.from("report_groups").update(groupUpdates).eq("id", group_id);

    return NextResponse.json({
      success: true,
      auto_reopened: autoReopened,
      new_avg_rating: groupUpdates.satisfaction_rating,
      new_count: newCount,
    });
  } catch (error) {
    console.error("Feedback POST error:", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}
