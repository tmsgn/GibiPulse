import { NextRequest, NextResponse } from "next/server";
import { analyzeReport } from "@/lib/groq";

export async function POST(request: NextRequest) {
  try {
    const { message, building, dorm_number } = await request.json();

    if (!message || message.trim().length < 5) {
      return NextResponse.json({ error: "Message too short" }, { status: 400 });
    }

    // Analyze with Groq AI - this endpoint doesn't save to the database
    const analysis = await analyzeReport({
      message: message.trim(),
      building: building?.trim(),
      dorm_number: dorm_number?.trim(),
    });

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Analysis API error:", error);
    return NextResponse.json(
      { error: "Failed to analyze report" },
      { status: 500 }
    );
  }
}
