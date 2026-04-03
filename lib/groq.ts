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
Your job is to analyze student-reported campus issues written in mixed Amharic, English, or "Amharlish" (a mix of both).

You MUST understand Ethiopian campus slang and Amharic phrases:
- "wuha tefa" / "wuha yelem" = water problem/outage
- "mabrat tefa" / "mabrat yelem" / "mabrat gone" = electricity/power outage  
- "net yelem" / "wifi yellem" / "internet yelem" = internet/WiFi problem
- "tarekegna" / "dirty" / "messy" = cleaning issue
- Dorm names: Abdisa Aga, Guna, Choke, Ras Dasha, Bale

Available BDU locations: ${BDU_LOCATIONS.join(", ")}

Analyze the message and respond with ONLY a valid JSON object in this exact format:
{
  "issue_type": "water" | "electricity" | "internet" | "cleaning" | "structural" | "security" | "other",
  "location": "exact BDU location name from the list, or 'Unknown Location' if not mentioned",
  "severity": "critical" | "high" | "medium" | "low",
  "ai_summary": "A clear 1-sentence English summary of the issue (max 100 chars)",
  "confidence": 0.0 to 1.0
}

Severity rules:
- critical: fire, flood, sparks, health risk, safety danger, no water for hygiene BEFORE meals
- high: complete outage affecting many students, broken essential facility
- medium: partial outage, slow internet, minor damage
- low: cleanliness, minor inconvenience, suggestion

Respond ONLY with the JSON. No explanation. No markdown.`;

export async function analyzeReport(message: string): Promise<AnalysisResult> {
  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Analyze this campus issue report: "${message}"` },
      ],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    // Validate and sanitize with heuristic fallback
    const result: AnalysisResult = {
      issue_type: validateIssueType(parsed.issue_type) ?? inferIssueType(message),
      location: validateLocation(parsed.location) ?? inferLocation(message),
      severity: validateSeverity(parsed.severity) ?? "medium",
      ai_summary: sanitizeSummary(parsed.ai_summary) ?? "Campus issue reported",
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.7)),
    };

    return result;
  } catch (error) {
    console.error("Groq analysis error:", error);
    // Fallback heuristic analysis
    return heuristicFallback(message);
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
  if (/wuha|water|pipe|flood|leak/.test(lower)) return "water";
  if (/mabrat|electric|power|light|spark/.test(lower)) return "electricity";
  if (/net|wifi|internet|connect/.test(lower)) return "internet";
  if (/dirty|trash|clean|messy|tarekegna/.test(lower)) return "cleaning";
  if (/wall|crack|broken|door|window|roof/.test(lower)) return "structural";
  if (/fight|danger|unsafe|thief|security/.test(lower)) return "security";
  return "other";
}

function inferLocation(message: string): string {
  const lower = message.toLowerCase();
  for (const loc of BDU_LOCATIONS) {
    if (lower.includes(loc.toLowerCase())) return loc;
  }
  if (/abdisa|abdissa/.test(lower)) return "Abdisa Aga Dorm";
  if (/guna/.test(lower)) return "Guna Dorm";
  if (/choke/.test(lower)) return "Choke Dorm";
  if (/cafe|cafeteria/.test(lower)) return "Main Cafeteria";
  if (/library|lib/.test(lower)) return "Main Library";
  return "Unknown Location";
}

function heuristicFallback(message: string): AnalysisResult {
  const issue_type = inferIssueType(message);
  const location = inferLocation(message);
  
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
