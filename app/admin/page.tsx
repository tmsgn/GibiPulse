"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  LogOut, RefreshCw, CheckCircle2, Clock,
  AlertTriangle, Users, BarChart3, Filter, Sparkles, Image as ImageIcon, X, Star, TrendingUp
} from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import { ISSUE_TYPE_CONFIG, SEVERITY_CONFIG, STATUS_CONFIG, timeAgo } from "@/lib/config";
import type { ReportGroup, IssueType, SeverityLevel, DepartmentStats } from "@/lib/types";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

const DEPARTMENTS = [
  "Plumbing Team",
  "Electrical Team",
  "IT / Network Team",
  "Cleaning Staff",
  "Structural / Maintenance",
  "Security Team",
  "General Maintenance",
];

// ─── Star Display (read-only) ─────────────────────────────────────────────────
function StarDisplay({ rating, count }: { rating: number | null; count: number }) {
  if (!rating || count === 0) return <span className="text-xs text-muted-foreground">No ratings yet</span>;
  const filled = Math.round(rating);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-3.5 h-3.5 ${s <= filled ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/30"}`}
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-foreground">{rating.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
  );
}

// ─── Department Rating Badge ──────────────────────────────────────────────────
function DeptRatingBadge({ avg }: { avg: number }) {
  if (avg >= 4) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">⭐ {avg.toFixed(1)}</span>;
  if (avg >= 2.5) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">⭐ {avg.toFixed(1)}</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">⭐ {avg.toFixed(1)}</span>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);

  const fetchGroups = useCallback(async () => {
    try {
      const [groupsRes, statsRes] = await Promise.all([
        fetch("/api/groups"),
        fetch("/api/groups?stats=departments"),
      ]);
      const groupsData = await groupsRes.json();
      const statsData = await statsRes.json();
      if (groupsData.groups) setGroups(groupsData.groups);
      if (statsData.departmentStats) setDepartmentStats(statsData.departmentStats);
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
    return () => clearInterval(interval);
  }, [fetchGroups]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchGroups();
    toast.success("Dashboard refreshed");
  };

  const handleUpdateGroup = async (
    id: string,
    updates: { status?: string; assigned_to?: string }
  ) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to update");
        return;
      }

      await fetchGroups();

      if (updates.status === "resolved") {
        toast.success("Issue marked as resolved ✓");
      } else if (updates.assigned_to) {
        toast.success(`Assigned to ${updates.assigned_to}`);
      }
    } catch {
      toast.error("Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
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
      {/* Top announcements bar */}
      <div className="bg-[#003d6b] text-white text-xs py-1.5 px-4 text-center">
        <span className="opacity-80">Bahir Dar University — GibiPulse Admin Dashboard</span>
      </div>

      {/* Main Header */}
      <header className="bg-[#005189] bdu-header-stripe shadow-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-white flex items-center justify-center overflow-hidden shadow-sm">
              <img src="/bdu-logo.png" alt="BDU Logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-none">GibiPulse Admin</p>
              <p className="text-[11px] text-blue-200 mt-0.5 tracking-wide">Bahir Dar University — Operations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-1.5 bg-green-500/20 text-green-300 text-xs px-2.5 py-1.5 rounded border border-green-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live — 15s
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
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5 h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
            >
              <LogOut className="w-3 h-3" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Groups</p>
            <p className="text-2xl font-bold text-foreground">{statsData.total}</p>
            <p className="text-xs text-muted-foreground">{statsData.totalReports} individual reports</p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded p-4">
            <p className="text-xs text-red-500 mb-1">Critical</p>
            <p className="text-2xl font-bold text-red-600">{statsData.critical}</p>
            <p className="text-xs text-red-400">Needs immediate action</p>
          </div>
          <div className="bg-card border border-border rounded p-4">
            <p className="text-xs text-muted-foreground mb-1">Open</p>
            <p className="text-2xl font-bold text-foreground">{statsData.open}</p>
            <p className="text-xs text-muted-foreground">Awaiting assignment</p>
          </div>
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded p-4">
            <p className="text-xs text-green-600 mb-1">Resolved</p>
            <p className="text-2xl font-bold text-green-700">{statsData.resolved}</p>
            <p className="text-xs text-green-500">
              {statsData.total > 0 ? Math.round((statsData.resolved / statsData.total) * 100) : 0}% resolution rate
            </p>
          </div>
        </div>

        {/* Analytics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Issue Breakdown */}
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

          {/* Hot Zones */}
          <Card className="shadow-none border-border">
            <CardHeader className="pb-2 pt-4 px-4 border-b border-border">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Hot Zones Today
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-3 space-y-2">
              {hotZones.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No active issues 🎉</p>
              ) : (
                hotZones.map(([location, count], i) => (
                  <div
                    key={location}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
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

          {/* Department Performance ── NEW */}
          <Card className="shadow-none border-border">
            <CardHeader className="pb-2 pt-4 px-4 border-b border-border">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Department Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-3 space-y-2.5">
              {departmentStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No feedback received yet</p>
              ) : (
                departmentStats
                  .sort((a, b) => b.avg_rating - a.avg_rating)
                  .map((dept) => (
                    <div key={dept.department} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{dept.department}</p>
                        <p className="text-[10px] text-muted-foreground">{dept.resolved_count} resolved</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <DeptRatingBadge avg={dept.avg_rating} />
                        <span className="text-[10px] text-muted-foreground">({dept.rated_count} rated)</span>
                      </div>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live Feed */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#005189]" />
              Live Issue Feed
            </h2>
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 text-xs w-[130px]">
                  <Filter className="w-3 h-3 mr-1" />
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
                <SelectTrigger className="h-8 text-xs w-[120px]">
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
                const isUpdating = updatingId === group.id;
                const isAutoReopened = group.reopen_count > 0 && group.status === "open";

                return (
                  <div
                    key={group.id}
                    className={`bg-card rounded border overflow-hidden transition-all duration-200 ${
                      isUpdating ? "opacity-60" : ""
                    } ${group.severity === "critical" && group.status !== "resolved" ? "border-red-300 dark:border-red-700" : "border-border"}`}
                  >
                    {/* Auto-reopened alert banner */}
                    {isAutoReopened && group.reopen_count >= 3 && (
                      <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <p className="text-[11px] font-bold text-red-600 uppercase tracking-wide">RE-OPENED BY STUDENTS</p>
                      </div>
                    )}

                    {/* Issue Header */}
                    <div className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded flex items-center justify-center flex-shrink-0 text-lg ${issueConfig?.bg}`}>
                          {issueConfig?.icon}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold text-[#005189] bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 px-1.5 py-0.5 rounded">
                              <Sparkles className="w-3 h-3" />
                              {group.image_url ? "Evidence Attached" : "AI Analyzed"}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-foreground leading-snug">{group.ai_summary}</p>
                          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 flex-wrap">
                            <span className="text-foreground bg-muted px-1.5 py-0.5 rounded text-[11px]">📍 {group.location}</span>
                            <span>•</span>
                            <span>{timeAgo(group.created_at)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {group.image_url && (
                          <div
                            className="relative w-12 h-12 rounded overflow-hidden border border-border cursor-zoom-in"
                            onClick={() => setSelectedImage(group.image_url!)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={group.image_url} alt="Evidence" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <ImageIcon className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${severityConfig?.bg}`}>
                          {severityConfig?.label}
                        </span>
                        <div className="flex items-center gap-1 text-muted-foreground bg-muted px-1.5 py-0.5 rounded text-xs border border-border">
                          <Users className="w-3 h-3" />
                          {group.report_count} match{group.report_count !== 1 ? 'es' : ''}
                        </div>
                      </div>
                    </div>

                    {/* Status row */}
                    <div className="px-4 py-2 flex items-center gap-2 flex-wrap bg-muted/20 border-t border-border">
                      <Badge className={`text-[10px] uppercase tracking-wider font-bold ${statusConfig?.bg} border-0`}>
                        ● {statusConfig?.label}
                      </Badge>
                      {group.assigned_to && (
                        <span className="text-xs text-muted-foreground">→ {group.assigned_to}</span>
                      )}

                      {/* Satisfaction stars on resolved issues */}
                      {group.status === "resolved" && (
                        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
                          <StarDisplay rating={group.satisfaction_rating} count={group.satisfaction_count} />
                          {group.reopen_count > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Flagged: {group.reopen_count}×
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions row */}
                    {group.status !== "resolved" && (
                      <div className="px-4 pb-3 pt-2 flex items-center gap-2 bg-muted/20">
                        <Select
                          value={group.assigned_to ?? ""}
                          onValueChange={(val) =>
                            handleUpdateGroup(group.id, {
                              assigned_to: val,
                              status: "assigned",
                            })
                          }
                          disabled={isUpdating}
                        >
                          <SelectTrigger className="h-8 text-xs flex-1">
                            <SelectValue placeholder="Assign to team..." />
                          </SelectTrigger>
                          <SelectContent>
                            {DEPARTMENTS.map((dept) => (
                              <SelectItem key={dept} value={dept} className="text-xs">
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                          onClick={() =>
                            handleUpdateGroup(group.id, { status: "resolved" })
                          }
                          disabled={isUpdating}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Resolve
                        </Button>
                      </div>
                    )}

                    {/* Resolved footer */}
                    {group.status === "resolved" && group.resolved_at && (
                      <div className="px-4 pb-3 pt-2 border-t border-border bg-green-50/50 dark:bg-green-950/10">
                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Resolved {timeAgo(group.resolved_at)}
                          {group.assigned_to && ` by ${group.assigned_to}`}
                        </p>
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
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Bahir Dar University — GibiPulse Admin</span>
          <span>Auto-refreshes every 15 seconds</span>
        </div>
      </footer>

      {/* Fullscreen Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-zoom-out"
          onClick={() => setSelectedImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedImage}
            alt="Evidence full view"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
      )}
    </div>
  );
}
