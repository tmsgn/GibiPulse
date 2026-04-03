import type { IssueType, SeverityLevel } from "./types";

export const ISSUE_TYPE_CONFIG: Record<
  IssueType,
  { label: string; icon: string; color: string; bg: string }
> = {
  water: {
    label: "Water",
    icon: "💧",
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
  },
  electricity: {
    label: "Electricity",
    icon: "⚡",
    color: "text-yellow-600",
    bg: "bg-yellow-50 border-yellow-200",
  },
  internet: {
    label: "Internet",
    icon: "📶",
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
  },
  cleaning: {
    label: "Cleaning",
    icon: "🧹",
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
  },
  structural: {
    label: "Structural",
    icon: "🏗️",
    color: "text-orange-600",
    bg: "bg-orange-50 border-orange-200",
  },
  security: {
    label: "Security",
    icon: "🛡️",
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
  },
  other: {
    label: "Other",
    icon: "📋",
    color: "text-gray-600",
    bg: "bg-gray-50 border-gray-200",
  },
};

export const SEVERITY_CONFIG: Record<
  SeverityLevel,
  { label: string; color: string; bg: string; dot: string }
> = {
  critical: {
    label: "Critical",
    color: "text-red-700",
    bg: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  high: {
    label: "High",
    color: "text-orange-700",
    bg: "bg-orange-100 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
  },
  medium: {
    label: "Medium",
    color: "text-yellow-700",
    bg: "bg-yellow-100 text-yellow-700 border-yellow-200",
    dot: "bg-yellow-500",
  },
  low: {
    label: "Low",
    color: "text-green-700",
    bg: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
};

export const STATUS_CONFIG = {
  open: { label: "Open", bg: "bg-gray-100 text-gray-700" },
  assigned: { label: "Assigned", bg: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In Progress", bg: "bg-yellow-100 text-yellow-700" },
  resolved: { label: "Resolved", bg: "bg-green-100 text-green-700" },
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
