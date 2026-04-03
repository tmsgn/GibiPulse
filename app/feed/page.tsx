"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Zap, RefreshCw, CheckCircle2, Clock,
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
import { ISSUE_TYPE_CONFIG, SEVERITY_CONFIG, STATUS_CONFIG, timeAgo } from "@/lib/config";
import type { ReportGroup, IssueType, SeverityLevel } from "@/lib/types";

export default function FeedPage() {
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

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
    toast.success("Feed refreshed");
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
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">GibiPulse</p>
              <p className="text-xs text-gray-400">Public Live Feed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 bg-green-50 text-green-700 text-xs px-2.5 py-1.5 rounded-full border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live Feed
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
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Analytics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Issue Breakdown */}
          <Card className="shadow-none border-gray-100">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                Trending Issues Currently
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
          <Card className="shadow-none border-gray-100">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Active Hot Zones
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {hotZones.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No active issues 🎉</p>
              ) : (
                hotZones.map(([location, count], i) => (
                  <div
                    key={location}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${i === 0 ? "text-red-500" : i === 1 ? "text-orange-500" : "text-yellow-500"}`}>
                        #{i + 1}
                      </span>
                      <p className="text-sm text-gray-700">{location}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-700">{count}</span>
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
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Live Reports Source
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
            <div className="text-center py-16 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading reports...</p>
            </div>
          ) : sortedGroups.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
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
                    className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                      group.severity === "critical" && group.status !== "resolved" ? "border-red-200" : "border-gray-200"
                    }`}
                  >
                    {/* Issue Header */}
                    <div className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl shadow-inner ${issueConfig?.bg}`}>
                          {issueConfig?.icon}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[15px] font-semibold text-gray-900">{group.ai_summary}</p>
                          </div>
                          <p className="text-xs font-medium text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded-md">📍 {group.location}</span>
                            <span>•</span>
                            <span>{timeAgo(group.created_at)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${severityConfig?.bg}`}>
                          {severityConfig?.label}
                        </span>
                        <div className="flex items-center gap-1 text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md text-xs font-medium border border-gray-100 shadow-sm">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          {group.report_count} matching report{group.report_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    {/* Status Footer */}
                    <div className="px-4 pb-3 pt-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[11px] uppercase tracking-wider ${statusConfig?.bg} border-0 font-bold shadow-sm`}>
                          {statusConfig?.label}
                        </Badge>
                        {group.assigned_to && (
                          <span className="text-xs font-medium text-gray-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Team Assigned: {group.assigned_to}
                          </span>
                        )}
                      </div>
                      
                      {group.status === "resolved" && group.resolved_at && (
                        <p className="text-[11px] font-bold text-green-700 flex items-center gap-1 bg-green-100 px-2 py-0.5 rounded-md border border-green-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          RESOLVED {timeAgo(group.resolved_at).toUpperCase()}
                        </p>
                      )}
                    </div>
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
