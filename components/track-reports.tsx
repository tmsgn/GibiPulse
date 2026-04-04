"use client";

import { useState } from "react";
import { Search, Loader2, Clock, CheckCircle2, AlertTriangle, ArrowRight, Activity, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ISSUE_TYPE_CONFIG, STATUS_CONFIG, timeAgo } from "@/lib/config";
import type { IssueType, IssueStatus } from "@/lib/types";

interface TrackedReport {
  id: string;
  ai_summary: string;
  issue_type: IssueType;
  location: string;
  created_at: string;
  status: IssueStatus;
  assigned_to: string | null;
  resolved_at: string | null;
}

export function TrackReports() {
  const [studentId, setStudentId] = useState("");
  const [reports, setReports] = useState<TrackedReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!studentId.trim()) {
      toast.error("Please enter your Student ID");
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/reports/status?student_id=${studentId.trim()}`);
      const data = await response.json();

      if (response.ok) {
        setReports(data.reports);
        if (data.reports.length === 0) {
          toast.info("No reports found for this Student ID");
        }
      } else {
        toast.error(data.error || "Failed to fetch reports");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-card rounded border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/40">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Search className="w-4 h-4 text-[#005189]" />
            Track Your Reports
          </h2>
        </div>
        
        <form onSubmit={handleSearch} className="p-5 flex gap-2">
          <Input
            placeholder="Enter Student ID (e.g. 1602534)"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="flex-1 h-10 rounded border-border focus:border-[#005189] focus:ring-2 focus:ring-[#005189]/20 font-mono text-sm"
          />
          <Button 
            type="submit" 
            disabled={loading}
            className="h-10 bg-[#005189] hover:bg-[#003d6b] text-white px-4"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Track"}
          </Button>
        </form>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 opacity-50" />
          <p className="text-sm">Fetching your reports...</p>
        </div>
      ) : hasSearched && reports.length === 0 ? (
        <div className="py-12 text-center bg-muted/20 border border-dashed border-border rounded">
          <Activity className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">No reports found for ID: {studentId}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Make sure you used the same ID as when you submitted.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const typeConfig = ISSUE_TYPE_CONFIG[report.issue_type];
            const statusConfig = STATUS_CONFIG[report.status];
            
            return (
              <div 
                key={report.id} 
                className="bg-card border border-border rounded overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-4 flex items-start gap-3">
                  <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 text-lg ${typeConfig?.bg || 'bg-muted'}`}>
                    {typeConfig?.icon || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${statusConfig?.bg}`}>
                        {statusConfig?.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(report.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1 line-clamp-2">
                      {report.ai_summary}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {report.location}
                      </span>
                      {report.assigned_to && (
                        <span className="flex items-center gap-1 text-[#005189] dark:text-blue-400 font-medium">
                          <Activity className="w-3 h-3" />
                          Assigned: {report.assigned_to}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="px-4 py-2 bg-muted/30 border-t border-border flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">Report ID: {report.id.substring(0, 8)}...</p>
                  {report.status === 'resolved' && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-3 h-3" />
                      FIXED
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
