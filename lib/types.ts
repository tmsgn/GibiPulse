export type IssueType = "water" | "electricity" | "internet" | "cleaning" | "structural" | "security" | "other";
export type SeverityLevel = "critical" | "high" | "medium" | "low";
export type IssueStatus = "open" | "assigned" | "in_progress" | "resolved";

export interface Report {
  id: string;
  student_id: string;
  raw_message: string;
  issue_type: IssueType;
  location: string;
  severity: SeverityLevel;
  status: IssueStatus;
  ai_summary: string;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  group_id: string | null;
  duplicate_count: number;
  image_url?: string | null;
}

export interface ReportGroup {
  id: string;
  issue_type: IssueType;
  location: string;
  severity: SeverityLevel;
  status: IssueStatus;
  ai_summary: string;
  report_count: number;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
  image_url?: string | null;
}

export interface AnalysisResult {
  issue_type: IssueType;
  location: string;
  severity: SeverityLevel;
  ai_summary: string;
  confidence: number;
}
