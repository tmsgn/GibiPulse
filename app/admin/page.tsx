"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Zap, LogOut, RefreshCw, CheckCircle2, Clock,
  AlertTriangle, Users, BarChart3, Filter
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
import type { ReportGroup, IssueType, SeverityLevel } from "@/lib/types";
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

export default function AdminDashboard() {
  const router = useRouter();
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("open");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
    // Poll every 15 seconds for live updates
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

  // Stats
  const statsData = {
    total: groups.length,
    critical: groups.filter((g) => g.severity === "critical" && g.status !== "resolved").length,
    open: groups.filter((g) => g.status === "open").length,
    resolved: groups.filter((g) => g.status === "resolved").length,
    totalReports: groups.reduce((acc, g) => acc + g.report_count, 0),
  };

  // Issue type breakdown
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

  // Hot zones
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

  // Filtered groups
  const filteredGroups = groups.filter((g) => {
    const typeMatch = filterType === "all" || g.issue_type === filterType;
    const statusMatch = filterStatus === "all" || g.status === filterStatus;
    return typeMatch && statusMatch;
  });

  // Sort by severity then date
  const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const sortedGroups = [...filteredGroups].sort((a, b) => {
    const sevDiff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Nav */}
      <div className="bg-card border-b border-border sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">GibiPulse Admin</p>
              <p className="text-xs text-muted-foreground">Bahir Dar University</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-1.5 bg-green-50 text-green-700 text-xs px-2.5 py-1.5 rounded-full border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live — auto-refresh 15s
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-1.5 h-8 text-xs"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5 h-8 text-xs text-gray-500"
            >
              <LogOut className="w-3 h-3" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="shadow-none border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Groups</p>
              <p className="text-2xl font-bold text-foreground">{statsData.total}</p>
              <p className="text-xs text-muted-foreground">{statsData.totalReports} individual reports</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border-red-100 bg-red-50">
            <CardContent className="p-4">
              <p className="text-xs text-red-400 mb-1">Critical</p>
              <p className="text-2xl font-bold text-red-600">{statsData.critical}</p>
              <p className="text-xs text-red-400">Needs immediate action</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Open</p>
              <p className="text-2xl font-bold text-foreground">{statsData.open}</p>
              <p className="text-xs text-muted-foreground">Awaiting assignment</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border-green-100 bg-green-50">
            <CardContent className="p-4">
              <p className="text-xs text-green-400 mb-1">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{statsData.resolved}</p>
              <p className="text-xs text-green-400">
                {statsData.total > 0 ? Math.round((statsData.resolved / statsData.total) * 100) : 0}% rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Issue Breakdown */}
          <Card className="shadow-none border-border">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Issue Breakdown (Active)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2.5">
              {Object.entries(ISSUE_TYPE_CONFIG).map(([type, config]) => {
                const count = typeCounts[type] || 0;
                const pct = Math.round((count / maxTypeCount) * 100);
                return (
                  <div key={type} className="flex items-center gap-2">
                    <span className="text-sm w-4">{config.icon}</span>
                    <p className="text-xs text-gray-600 w-20">{config.label}</p>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs font-semibold text-gray-700 w-8 text-right">{count}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Hot Zones */}
          <Card className="shadow-none border-border">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Hot Zones Today
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
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
        </div>

        {/* Live Feed */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
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

                return (
                  <div
                    key={group.id}
                    className={`bg-card rounded-2xl border shadow-none overflow-hidden transition-opacity ${
                      isUpdating ? "opacity-60" : ""
                    } ${group.severity === "critical" && group.status !== "resolved" ? "border-red-500/50" : "border-border"}`}
                  >
                    {/* Issue Header */}
                    <div className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${issueConfig?.bg}`}>
                          {issueConfig?.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">{group.ai_summary}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            📍 {group.location} · {timeAgo(group.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${severityConfig?.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${severityConfig?.dot}`} />
                          {severityConfig?.label}
                        </span>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="w-3 h-3" />
                          <span className="text-xs font-semibold">{group.report_count}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status + Assigned */}
                    <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs ${statusConfig?.bg} border-0`}>
                        {statusConfig?.label}
                      </Badge>
                      {group.assigned_to && (
                        <span className="text-xs text-muted-foreground">
                          → {group.assigned_to}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    {group.status !== "resolved" && (
                      <div className="px-4 pb-4 flex items-center gap-2 border-t border-border pt-3">
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
                          className="h-8 text-xs gap-1.5 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/10"
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

                    {group.status === "resolved" && group.resolved_at && (
                      <div className="px-4 pb-3 pt-2 border-t border-border">
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
    </div>
  );
}
