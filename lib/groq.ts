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

const SYSTEM_PROMPT = `You are an AI assistant for Bahir Dar University (BDU) campus management system called GibiPulse.
Your job is to analyze student-reported campus issues written in Amharic, English, or a mix of both (called "Amharlish").

You are FLUENT in Amharic. You MUST correctly interpret full Amharic sentences and words, not just slang.

Common Amharic issue phrases:
- ውሃ ጠፋ / ውሃ የለም / "wuha tefa" / "wuha yelem" = water outage/problem
- ማብራት ጠፋ / ማብራት የለም / "mabrat tefa" / "mabrat yelem" / "mabrat gone" = power/electricity outage
- ኢንተርኔት የለም / ኔት የለም / "net yelem" / "wifi yellem" = internet/WiFi problem
- ቆሻሻ ነው / ማፅዳት ያስፈልጋል / "tarekegna" / "dirty" = cleaning issue
- ደህንነት አደጋ / ስጋት = security concern
- ምግብ ቤት / ካፍቴሪያ = cafeteria
- ቤተ-መጻሕፍት / ቤተ-መፃህፍት = library
- ድረ-ቤት / ፎቅ = building/block
- ዶርም / ሕንፃ = dorm/building

Context: The student's declared building and dorm room will be provided to you. Use them to set the location when the message text itself does not mention a location.

Available BDU locations: ${BDU_LOCATIONS.join(", ")}

Location resolution rules (apply in order):
1. If the message text explicitly names a location, use that.
2. If not, use the student's declared building name to pick the closest match from the locations list.
3. Only use 'Unknown Location' if neither the message nor the building field provides any useful location info.

Analyze the message and respond with ONLY a valid JSON object in this exact format:
{
  "issue_type": "water" | "electricity" | "internet" | "cleaning" | "structural" | "security" | "other",
  "location": "exact BDU location name from the list, or 'Unknown Location' if not determinable",
  "severity": "critical" | "high" | "medium" | "low",
  "ai_summary": "A 1-sentence English summary. MUST start with the specific Building and Dorm/Room number (e.g., '[Bale Dorm, Room 102] Water is...'). Max 120 chars.",
  "confidence": 0.0 to 1.0
}

Severity rules:
- critical: fire, flood, sparks, health risk, safety danger, no water for hygiene before meals
- high: complete outage affecting many students, broken essential facility
- medium: partial outage, slow internet, minor damage
- low: cleanliness, minor inconvenience, suggestion

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

  const userPromptText = `Analyze this campus issue report: "${message}"${locationHint}`;

  const userMessageContent = image_url 
    ? [
        { type: "text", text: userPromptText },
        { type: "image_url", image_url: { url: image_url } }
      ]
    : userPromptText;

  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: image_url ? "llama-3.2-90b-vision-preview" : "llama3-70b-8192",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessageContent as string },
      ] as any,
      temperature: 0.1,
      max_tokens: 250,
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
    return heuristicFallback(message, building);
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
  if (/mabrat|electric|power|light|spark|ማብራት/.test(lower)) return "electricity";
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

function heuristicFallback(message: string, building?: string): AnalysisResult {
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

  return {
    issue_type,
    location,
    severity: "medium",
    ai_summary: `${typeLabels[issue_type]} reported at ${location}`,
    confidence: 0.5,
  };
}
