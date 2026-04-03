import type { IssueType, SeverityLevel } from "./types";

export const ISSUE_TYPE_CONFIG: Record<
  IssueType,
  { label: string; icon: string; color: string; bg: string }
> = {
  water: {
    label: "Water",
    icon: "💧",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  electricity: {
    label: "Electricity",
    icon: "⚡",
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
  },
  internet: {
    label: "Internet",
    icon: "📶",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  cleaning: {
    label: "Cleaning",
    icon: "🧹",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
  },
  structural: {
    label: "Structural",
    icon: "🏗️",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
  },
  security: {
    label: "Security",
    icon: "🛡️",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
  other: {
    label: "Other",
    icon: "📋",
    color: "text-muted-foreground",
    bg: "bg-muted border-border",
  },
};

export const SEVERITY_CONFIG: Record<
  SeverityLevel,
  { label: string; color: string; bg: string; dot: string }
> = {
  critical: {
    label: "Critical",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    dot: "bg-red-500",
  },
  high: {
    label: "High",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    dot: "bg-orange-500",
  },
  medium: {
    label: "Medium",
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    dot: "bg-yellow-500",
  },
  low: {
    label: "Low",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    dot: "bg-green-500",
  },
};

export const STATUS_CONFIG = {
  open: { label: "Needs Assignment", bg: "bg-muted text-muted-foreground border-border" },
  assigned: { label: "Assigned", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  in_progress: { label: "In Progress", bg: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" },
  resolved: { label: "Resolved", bg: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" },
};

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}
