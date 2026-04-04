"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  RefreshCw, CheckCircle2, Clock,
  AlertTriangle, Users, BarChart3, Filter, ArrowLeft, Star, Loader2, MessageSquare
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ISSUE_TYPE_CONFIG, SEVERITY_CONFIG, STATUS_CONFIG, timeAgo } from "@/lib/config";
import type { ReportGroup, IssueType, SeverityLevel } from "@/lib/types";
import { ThemeToggle } from "@/components/theme-toggle";

// ─── Star Rating Widget ───────────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="transition-all duration-150 hover:scale-125 active:scale-95"
          aria-label={`Rate ${star} stars`}
        >
          <Star
            className={`w-8 h-8 transition-colors duration-150 ${
              star <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Feedback Panel ──────────────────────────────────────────────────────────
function FeedbackPanel({
  groupId,
  studentId,
}: {
  groupId: string;
  studentId: string;
}) {
  const [rating, setRating] = useState(0);
  const [isNotFixed, setIsNotFixed] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFeedbackSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a star rating first");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id: groupId,
          student_id: studentId,
          rating,
          comment: comment.trim() || null,
          is_not_fixed: isNotFixed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to submit feedback");
        return;
      }
      setSubmitted(true);
      if (data.auto_reopened) {
        toast.info("Your flag helped re-open this issue!", { duration: 5000 });
      } else {
        toast.success("Thank you for your feedback! 🙏");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-500/10 border-t border-green-500/20 p-4 text-center animate-in fade-in zoom-in-95 duration-300">
        <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-1.5" />
        <p className="text-sm font-semibold text-green-700 dark:text-green-400">Feedback Submitted!</p>
        <p className="text-xs text-green-600/80 mt-0.5">Your voice helps improve campus services.</p>
      </div>
    );
  }

  return (
    <div className="bg-muted/10 border-t border-border p-4 space-y-4 shadow-inner">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-4 h-4 text-[#005189] fill-[#005189]/20" />
        <p className="text-sm font-bold text-foreground">Rate the Resolution</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
          Rate your satisfaction
        </p>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setIsNotFixed(false)}
          className={`flex items-center justify-center gap-2 py-2 rounded text-xs font-semibold border transition-all duration-200 ${
            !isNotFixed
              ? "bg-green-500/10 border-green-500/40 text-green-700 dark:text-green-400"
              : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          ✅ Problem Fixed
        </button>
        <button
          type="button"
          onClick={() => setIsNotFixed(true)}
          className={`flex items-center justify-center gap-2 py-2 rounded text-xs font-semibold border transition-all duration-200 ${
            isNotFixed
              ? "bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-400"
              : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          🚨 Not Fixed Yet
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Comment <span className="normal-case font-normal">(optional)</span>
        </label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share more details about the resolution..."
          className="min-h-12 resize-none text-xs rounded bg-muted/40 border-input"
          maxLength={200}
        />
      </div>

      <Button
        size="sm"
        onClick={handleFeedbackSubmit}
        disabled={submitting || rating === 0}
        className="w-full h-9 rounded font-semibold text-xs bg-[#005189] hover:bg-[#003d6b] text-white"
      >
        {submitting ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin opacity-70" />
            Submitting...
          </div>
        ) : (
          "Submit Feedback"
        )}
      </Button>
    </div>
  );
}

export default function FeedPage() {
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expandedFeedbackId, setExpandedFeedbackId] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      if (data.groups) setGroups(data.groups);
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    const interval = setInterval(fetchGroups, 15000);
    
    // Manage persistent session ID for feedback if student isn't explicitly logged in
    let sid = localStorage.getItem("gibipulse_device_session");
    if (!sid) {
      sid = "anon_" + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("gibipulse_device_session", sid);
    }
    setSessionId(sid);

    return () => clearInterval(interval);
  }, [fetchGroups]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchGroups();
    toast.success("Feed refreshed");
  };

  const statsData = {
    total: groups.length,
    critical: groups.filter((g) => g.severity === "critical" && g.status !== "resolved").length,
    open: groups.filter((g) => g.status === "open").length,
    resolved: groups.filter((g) => g.status === "resolved").length,
    totalReports: groups.reduce((acc, g) => acc + g.report_count, 0),
  };

  const typeCounts = groups
    .filter((g) => g.status !== "resolved")
    .reduce(
      (acc, g) => {
        acc[g.issue_type] = (acc[g.issue_type] || 0) + g.report_count;
        return acc;
      },
      {} as Record<string, number>
    );

  const maxTypeCount = Math.max(...Object.values(typeCounts), 1);

  const locationCounts = groups
    .filter((g) => g.status !== "resolved")
    .reduce(
      (acc, g) => {
        acc[g.location] = (acc[g.location] || 0) + g.report_count;
        return acc;
      },
      {} as Record<string, number>
    );

  const hotZones = Object.entries(locationCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const filteredGroups = groups.filter((g) => {
    const typeMatch = filterType === "all" || g.issue_type === filterType;
    const statusMatch = filterStatus === "all" || g.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const sortedGroups = [...filteredGroups].sort((a, b) => {
    const sevDiff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="bg-[#003d6b] text-white text-xs py-1.5 px-4 text-center">
        <span className="opacity-80">Bahir Dar University — Campus Infrastructure Live Feed</span>
      </div>

      {/* Header */}
      <header className="bg-[#005189] bdu-header-stripe shadow-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-white flex items-center justify-center overflow-hidden shadow-sm">
              <img src="/bdu-logo.png" alt="BDU Logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-none">GibiPulse</p>
              <p className="text-[11px] text-blue-200 mt-0.5">Public Live Feed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-1.5 bg-green-500/20 text-green-300 text-xs px-2.5 py-1.5 rounded border border-green-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live — 15s refresh
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-1.5 h-8 text-xs text-white border-white/30 bg-white/10 hover:bg-white/20"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = "/"}
              className="gap-1.5 h-8 text-xs text-white border-white/30 bg-white/10 hover:bg-white/20"
            >
              <ArrowLeft className="w-3 h-3" />
              Report
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Groups", value: statsData.total, sub: `${statsData.totalReports} reports` },
            { label: "Critical", value: statsData.critical, sub: "Active", danger: true },
            { label: "Open", value: statsData.open, sub: "Pending" },
            { label: "Resolved", value: statsData.resolved, sub: `${statsData.total > 0 ? Math.round((statsData.resolved / statsData.total) * 100) : 0}% rate`, success: true },
          ].map((stat) => (
            <div key={stat.label} className={`bg-card border rounded p-4 ${stat.danger ? 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800' : stat.success ? 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800' : 'border-border'}`}>
              <p className={`text-xs mb-1 ${stat.danger ? 'text-red-500' : stat.success ? 'text-green-600' : 'text-muted-foreground'}`}>{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.danger ? 'text-red-600' : stat.success ? 'text-green-700' : 'text-foreground'}`}>{stat.value}</p>
              <p className={`text-xs ${stat.danger ? 'text-red-400' : stat.success ? 'text-green-500' : 'text-muted-foreground'}`}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Analytics row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="shadow-none border-border">
            <CardHeader className="pb-2 pt-4 px-4 border-b border-border">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#005189]" />
                Issue Breakdown (Active)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-3 space-y-2.5">
              {Object.entries(ISSUE_TYPE_CONFIG).map(([type, config]) => {
                const count = typeCounts[type] || 0;
                const pct = Math.round((count / maxTypeCount) * 100);
                return (
                  <div key={type} className="flex items-center gap-2">
                    <span className="text-sm w-4">{config.icon}</span>
                    <p className="text-xs text-muted-foreground w-20">{config.label}</p>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#005189] rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs font-semibold text-foreground w-6 text-right">{count}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="shadow-none border-border">
            <CardHeader className="pb-2 pt-4 px-4 border-b border-border">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Hot Zones
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-3 space-y-2">
              {hotZones.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No active issues 🎉</p>
              ) : (
                hotZones.map(([location, count], i) => (
                  <div key={location} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${i === 0 ? "text-red-500" : i === 1 ? "text-orange-500" : "text-yellow-500"}`}>
                        #{i + 1}
                      </span>
                      <p className="text-sm text-foreground">{location}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{count}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live Feed */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#005189]" />
              Live Issue Reports
            </h2>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 text-xs flex-1 sm:w-[130px]">
                  <Filter className="w-3 h-3 mr-1 hidden sm:block" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(ISSUE_TYPE_CONFIG).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      {config.icon} {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs flex-1 sm:w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading reports...</p>
            </div>
          ) : sortedGroups.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="text-sm">No issues match your filter</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedGroups.map((group) => {
                const issueConfig = ISSUE_TYPE_CONFIG[group.issue_type as IssueType];
                const severityConfig = SEVERITY_CONFIG[group.severity as SeverityLevel];
                const statusConfig = STATUS_CONFIG[group.status];

                return (
                  <div
                    key={group.id}
                    className={`bg-card rounded border overflow-hidden transition-shadow hover:shadow-sm ${
                      group.severity === "critical" && group.status !== "resolved" ? "border-red-300 dark:border-red-700" : "border-border"
                    }`}
                  >
                    <div className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded flex items-center justify-center flex-shrink-0 text-lg ${issueConfig?.bg}`}>
                          {issueConfig?.icon}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="text-sm font-semibold text-foreground leading-snug">{group.ai_summary}</p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="text-foreground bg-muted px-1.5 py-0.5 rounded text-[11px]">📍 {group.location}</span>
                            <span>•</span>
                            <span>{timeAgo(group.created_at)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${severityConfig?.bg}`}>
                          {severityConfig?.label}
                        </span>
                        <div className="flex items-center gap-1 text-muted-foreground bg-muted px-1.5 py-0.5 rounded text-xs border border-border">
                          <Users className="w-3 h-3" />
                          {group.report_count}
                        </div>
                      </div>
                    </div>

                    <div className="px-4 pb-3 pt-2 bg-muted/30 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] uppercase tracking-wider ${statusConfig?.bg} border-0 font-bold`}>
                          {statusConfig?.label}
                        </Badge>
                        {group.assigned_to && (
                          <span className="text-xs text-muted-foreground">
                            Team: {group.assigned_to}
                          </span>
                        )}
                      </div>
                      {group.status === "resolved" && group.resolved_at && (
                        <p className="text-[11px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Resolved {timeAgo(group.resolved_at)}
                        </p>
                      )}
                    </div>

                    {/* Expandable Feedback Section for Resolved Issues */}
                    {group.status === "resolved" && (
                      <div className="border-t border-border bg-background">
                        <button
                          onClick={() => setExpandedFeedbackId(expandedFeedbackId === group.id ? null : group.id)}
                          className="w-full px-4 py-2 text-xs font-semibold text-[#005189] hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Star className="w-3.5 h-3.5" />
                          {expandedFeedbackId === group.id ? "Close Feedback" : "Rate Resolution"}
                        </button>
                        {expandedFeedbackId === group.id && sessionId && (
                          <FeedbackPanel groupId={group.id} studentId={sessionId} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-8">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Bahir Dar University — GibiPulse</span>
          <span>Auto-refreshes every 15 seconds</span>
        </div>
      </footer>
    </div>
  );
}
