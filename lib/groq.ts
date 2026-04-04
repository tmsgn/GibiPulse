import Groq from "groq-sdk";
import type { AnalysisResult, IssueType, SeverityLevel } from "./types";

// Lazy client — avoids module-level crash if key is not set at build time
let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set");
    }
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

const BDU_LOCATIONS = [
  "Abdisa Aga Dorm",
  "Guna Dorm",
  "Choke Dorm",
  "Ras Dasha Dorm",
  "Bale Dorm",
  "Main Cafeteria",
  "Main Library",
  "Block A",
  "Block B",
  "Block C",
  "Block D",
  "Engineering Building",
  "Science Building",
  "IT Building",
  "Admin Building",
  "Health Center",
  "Sports Field",
  "Main Gate",
  "Campus",
];

const SYSTEM_PROMPT = `You are an expert AI triage assistant for Bahir Dar University's (BDU) campus maintenance system, GibiPulse.
Students report issues in Amharic, English, or a mixed dialect known as "Amharlish". You are fully fluent in all three.

## YOUR PRIMARY TASK
Read the student's message and use SEMANTIC REASONING — not just keyword matching — to understand the true intent and classify the issue. Students may describe the same problem in dozens of different ways. Your job is to understand WHAT IS WRONG, not just recognize specific words.

## ISSUE TYPE DEFINITIONS (use these to reason about ANY phrasing)
- **electricity**: ANY problem related to power, lighting, electrical equipment. This includes: bulbs not working, lights out, flickering, sparks, burnt outlets, power cuts, generator issues, no electricity, dark room, "mabrat tefa", "mabrat yellem", "light gone", "ማብራት ጠፋ/የለም", fuse blown, fan not working due to power, etc.
- **water**: ANY problem related to water supply or drainage. This includes: no water, low pressure, pipe leaking, flooding, sewage smell, tap broken, shower not working, "wuha tefa", "wuha yellem", "ውሃ ጠፋ/የለም", blocked drain, toilet overflow, etc.
- **internet**: ANY problem with network or connectivity. This includes: no WiFi, slow internet, can't connect, WiFi password changed, Ethernet down, "net yellem", "wifi yellem", "ኢንተርኔት የለም", router down, VPN blocked, etc.
- **cleaning**: ANY hygiene or waste-related issue. This includes: overflowing bins, dirty bathrooms, foul smell, garbage not collected, pests/rats/cockroaches, "tarekegna", "ቆሻሻ ነው", "ማፅዳት ያስፈልጋል", mold, dirty kitchen/cafeteria, etc.
- **structural**: ANY physical damage to the building or infrastructure. This includes: cracked walls, broken door/window/lock, ceiling falling, flooded floor (non-water-supply), damaged furniture, roof leaking, broken steps, "ፎቅ ተሰበረ", etc.
- **security**: ANY threat to personal safety or campus security. This includes: theft, fights, strangers in dorms, broken gates, missing CCTV, harassment, "ደህንነት", "ስጋት", feeling unsafe, no guard, etc.
- **other**: ONLY use this if the issue genuinely does not fit any of the categories above.

## LANGUAGE CONTEXT
Students often blend Amharic + English in the same message. Examples of how the same issue may be described:
- Electricity: "our room dark", "bulb tefa", "light gone since yesterday", "ማብራቱ ዛሬም የለም", "no current in block C"
- Water: "no water since morning", "tap yellem", "shower aይሰራም", "ውሃ ቆሟል"
- Internet: "can't upload assignment", "wifi ayiseram", "net slow slow"
Always reason from CONTEXT and MEANING, not surface-level word matching.

## LOCATION
Available BDU locations: ${BDU_LOCATIONS.join(", ")}
Location resolution rules (apply in order):
1. If the message explicitly names a location, use that.
2. Otherwise, use the student's declared building to pick the closest match.
3. Only use 'Unknown Location' as a last resort.

## SUMMARY RULES
4. LOCATION PREFIX: If a building or dorm room is provided, your ai_summary MUST start with it in brackets. Example: "[Bale Dorm, Room 204] No electricity since 6am."
5. IMAGE ANALYSIS: If an image is provided, ANALYZE it visually and weave your findings into the ai_summary. Example: "Image shows a shattered bulb socket — electricity issue confirmed."

Analyze the message and respond with ONLY a valid JSON object in this exact format:
{
  "issue_type": "water" | "electricity" | "internet" | "cleaning" | "structural" | "security" | "other",
  "location": "exact BDU location name from the list, or 'Unknown Location' if not determinable",
  "severity": "critical" | "high" | "medium" | "low",
  "ai_summary": "1-sentence English summary. Start with [Building, Room] if known. Include image analysis if provided. Max 200 chars.",
  "confidence": 0.0 to 1.0
}

## SEVERITY GUIDE
- critical: fire, electrical sparks, flood, structural collapse risk, health/hygiene emergency
- high: complete outage affecting many students, broken essential facility (toilet, shower)
- medium: partial outage, degraded service, single room affected
- low: minor inconvenience, cosmetic damage, suggestion

Respond ONLY with the JSON. No explanation. No markdown.`;

export interface ReportContext {
  message: string;
  building?: string;
  dorm_number?: string;
  image_url?: string;
}

export async function analyzeReport(ctx: ReportContext): Promise<AnalysisResult> {
  const { message, building, dorm_number, image_url } = ctx;

  // Build the enriched user prompt so the AI has full context
  const locationHint = building
    ? `\n\nStudent's declared building: "${building}"${dorm_number ? `, dorm/room: ${dorm_number}` : ""}.`
    : "";

  // When an image is present, instruct the AI to treat it as PRIMARY evidence
  const imageInstruction = image_url
    ? `\n\nAn image has been uploaded by the student. IMPORTANT: Look at the image carefully. Use what you SEE in the image as your PRIMARY source of evidence to determine the issue_type, severity, and ai_summary. The student's text is supporting context — the image is the ground truth. Describe what is visually wrong in your ai_summary.`
    : "";

  const userPromptText = `Analyze this campus issue report: "${message}"${locationHint}${imageInstruction}`;

  const userMessageContent = image_url
    ? [
        { type: "text", text: userPromptText },
        { type: "image_url", image_url: { url: image_url } },
      ]
    : userPromptText;

  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      // Use vision model whenever an image is attached — it can see AND read text
      model: image_url ? "llama-3.2-90b-vision-preview" : "llama3-70b-8192",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessageContent as string },
      ] as any,
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    // Validate and sanitize with heuristic fallback
    const result: AnalysisResult = {
      issue_type: validateIssueType(parsed.issue_type) ?? inferIssueType(message),
      location: validateLocation(parsed.location) ?? inferLocation(message, building),
      severity: validateSeverity(parsed.severity) ?? "medium",
      ai_summary: sanitizeSummary(parsed.ai_summary) ?? "Campus issue reported",
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.7)),
    };

    return result;
  } catch (error) {
    console.error("Groq analysis error:", error);
    // Fallback heuristic analysis
    return heuristicFallback(message, building, dorm_number);
  }
}

// --- Validators ---
function validateIssueType(value: unknown): IssueType | null {
  const valid: IssueType[] = ["water", "electricity", "internet", "cleaning", "structural", "security", "other"];
  return valid.includes(value as IssueType) ? (value as IssueType) : null;
}

function validateLocation(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value === "Unknown Location") return value;
  const match = BDU_LOCATIONS.find(
    (loc) => loc.toLowerCase() === value.toLowerCase()
  );
  return match ?? null;
}

function validateSeverity(value: unknown): SeverityLevel | null {
  const valid: SeverityLevel[] = ["critical", "high", "medium", "low"];
  return valid.includes(value as SeverityLevel) ? (value as SeverityLevel) : null;
}

function sanitizeSummary(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return value.slice(0, 120);
}

// --- Heuristic Fallbacks ---
function inferIssueType(message: string): IssueType {
  const lower = message.toLowerCase();
  // English + Amharic transliteration + Ethiopic script keywords
  if (/wuha|water|pipe|flood|leak|ውሃ/.test(lower)) return "water";
  if (/mabrat|electric|power|light|bulb|spark|ማብራት/.test(lower)) return "electricity";
  if (/net|wifi|internet|connect|ኢንተርኔት/.test(lower)) return "internet";
  if (/dirty|trash|clean|messy|tarekegna|ቆሻሻ/.test(lower)) return "cleaning";
  if (/wall|crack|broken|door|window|roof|ፎቅ/.test(lower)) return "structural";
  if (/fight|danger|unsafe|thief|security|ደህንነት/.test(lower)) return "security";
  return "other";
}

function inferLocation(message: string, building?: string): string {
  const lower = message.toLowerCase();

  // 1. Try to find a location name directly in the message text
  for (const loc of BDU_LOCATIONS) {
    if (lower.includes(loc.toLowerCase())) return loc;
  }
  if (/abdisa|abdissa/.test(lower)) return "Abdisa Aga Dorm";
  if (/guna/.test(lower)) return "Guna Dorm";
  if (/choke/.test(lower)) return "Choke Dorm";
  if (/ras.?dasha/.test(lower)) return "Ras Dasha Dorm";
  if (/bale/.test(lower)) return "Bale Dorm";
  if (/cafe|cafeteria|ምግብ.?ቤት/.test(lower)) return "Main Cafeteria";
  if (/library|lib|ቤተ.?መጻሕፍት/.test(lower)) return "Main Library";

  // 2. Fall back to the student's declared building
  if (building) {
    const buildingLower = building.toLowerCase();
    const match = BDU_LOCATIONS.find((loc) =>
      loc.toLowerCase().includes(buildingLower) ||
      buildingLower.includes(loc.toLowerCase().replace(" dorm", "").replace(" building", ""))
    );
    if (match) return match;
    // partial keyword match from building field
    if (/abdisa|abdissa/.test(buildingLower)) return "Abdisa Aga Dorm";
    if (/guna/.test(buildingLower)) return "Guna Dorm";
    if (/choke/.test(buildingLower)) return "Choke Dorm";
    if (/ras.?dasha/.test(buildingLower)) return "Ras Dasha Dorm";
    if (/bale/.test(buildingLower)) return "Bale Dorm";
    if (/block.?a/.test(buildingLower)) return "Block A";
    if (/block.?b/.test(buildingLower)) return "Block B";
    if (/block.?c/.test(buildingLower)) return "Block C";
    if (/block.?d/.test(buildingLower)) return "Block D";
    if (/cafe|cafeteria/.test(buildingLower)) return "Main Cafeteria";
    if (/library|lib/.test(buildingLower)) return "Main Library";
    if (/engineering/.test(buildingLower)) return "Engineering Building";
    if (/science/.test(buildingLower)) return "Science Building";
    if (/it|network/.test(buildingLower)) return "IT Building";
    if (/admin/.test(buildingLower)) return "Admin Building";
    if (/health/.test(buildingLower)) return "Health Center";
  }

  return "Unknown Location";
}

function heuristicFallback(message: string, building?: string, dorm_number?: string): AnalysisResult {
  const issue_type = inferIssueType(message);
  const location = inferLocation(message, building);
  
  const typeLabels: Record<IssueType, string> = {
    water: "Water issue",
    electricity: "Electricity issue",
    internet: "Internet issue",
    cleaning: "Cleaning issue",
    structural: "Structural issue",
    security: "Security concern",
    other: "Campus issue",
  };

  const roomText = dorm_number ? `, Room ${dorm_number}` : "";
  const locationPrefix = (building || location !== "Unknown Location") 
    ? `[${building || location}${roomText}] ` 
    : "";

  return {
    issue_type,
    location,
    severity: "medium",
    ai_summary: `${locationPrefix}${typeLabels[issue_type]} reported`,
    confidence: 0.5,
  };
}
