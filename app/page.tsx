"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Send, CheckCircle2, AlertTriangle, Zap, Sparkles, ChevronRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ISSUE_TYPE_CONFIG, SEVERITY_CONFIG, timeAgo } from "@/lib/config";
import type { AnalysisResult } from "@/lib/types";

const EXAMPLE_REPORTS = [
  "Abdisa aga wuha tefa again, we can't even wash our hands",
  "Guna dorm mabrat yellem since 6am, exam today",
  "Main library net yelem, can't submit assignment",
];

interface SubmitResult {
  analysis: AnalysisResult;
  merged: boolean;
  group_count: number;
  message: string;
}

interface RecentIssue {
  type: string;
  location: string;
  severity: string;
  time: string;
}

export default function StudentPage() {
  const [studentId, setStudentId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [recentIssues, setRecentIssues] = useState<RecentIssue[]>([]);

  useEffect(() => {
    // Simulated realistic recent feed
    setRecentIssues([
      { type: "water", location: "Abdisa Aga Dorm", severity: "high", time: new Date(Date.now() - 4 * 60000).toISOString() },
      { type: "electricity", location: "Block C", severity: "critical", time: new Date(Date.now() - 12 * 60000).toISOString() },
    ]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentId.trim()) {
      toast.error("Please enter your student ID");
      return;
    }
    if (!message.trim()) {
      toast.error("Please describe the issue");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId.trim(),
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Failed to submit report");
        return;
      }

      setResult(data);
      toast.success("Issue securely transmitted!");
      setMessage("");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setMessage(example);
    setIsFocused(true);
    // Smooth scroll slightly down if on mobile to focus textarea
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  if (result) {
    const issueConfig = ISSUE_TYPE_CONFIG[result.analysis.issue_type];
    const severityConfig = SEVERITY_CONFIG[result.analysis.severity];

    return (
      <div className="min-h-screen bg-[#FAFAFC] flex flex-col items-center justify-center p-4 selection:bg-blue-100">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/60 overflow-hidden relative">
            {/* Background decorative gradient */}
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-green-50/80 to-transparent pointer-events-none" />
            
            <div className="relative px-8 pt-10 pb-8 text-center border-b border-gray-50">
              <div className="w-16 h-16 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4 shadow-sm border border-green-200/50 relative">
                <div className="absolute inset-0 rounded-2xl bg-green-400 opacity-20 animate-ping duration-1000" />
                <CheckCircle2 className="w-8 h-8 relative z-10" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Report Received</h2>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                Our AI has processed your report and categorized it for immediate routing.
              </p>
            </div>

            <div className="px-8 py-6 space-y-5 bg-gray-50/50">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 translate-x-2 -translate-y-2 transform group-hover:scale-110 transition-transform duration-700">
                  <span className="text-6xl">{issueConfig.icon}</span>
                </div>
                
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Extracted Issue</p>
                  <p className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                    {issueConfig.label}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Priority</p>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md border uppercase tracking-wide ${severityConfig.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${severityConfig.dot} animate-pulse`} />
                      {severityConfig.label}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Location</p>
                    <p className="font-medium text-gray-800 text-sm truncate" title={result.analysis.location}>📍 {result.analysis.location}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 rounded-2xl p-5 border border-blue-100/50">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-widest">AI Synopsis</p>
                </div>
                <p className="text-[15px] text-gray-700 font-medium leading-snug">{result.analysis.ai_summary}</p>
              </div>

              {result.merged && result.group_count > 1 && (
                <div className="flex items-start gap-3 bg-gradient-to-r from-amber-50 to-yellow-50/30 text-amber-800 rounded-2xl p-4 border border-amber-100/50">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium leading-relaxed">
                    <strong className="font-bold text-amber-900">{result.group_count} students</strong> have reported this. Your submission strengthens the priority level!
                  </p>
                </div>
              )}
            </div>

            <div className="px-8 pb-8 pt-2 space-y-3 bg-gray-50/50">
              <Button
                onClick={() => { setResult(null); setMessage(""); }}
                className="w-full h-12 rounded-xl text-[15px] font-semibold bg-gray-900 hover:bg-gray-800 transition-all shadow-md shadow-gray-900/10"
              >
                Submit New Issue
              </Button>
              <Button
                onClick={() => window.location.href = "/feed"}
                className="w-full h-12 rounded-xl text-[15px] font-semibold text-gray-600 bg-white border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-all"
                variant="outline"
              >
                View Live Campus Feed
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFE] selection:bg-blue-100 relative overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-50/60 to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-20 -left-20 w-72 h-72 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Modern Header */}
      <nav className="relative z-20 border-b border-gray-100/50 bg-white/70 backdrop-blur-md supports-[backdrop-filter]:bg-white/40">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Zap className="w-4 h-4 text-white fill-current" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-[15px] tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">GibiPulse</p>
              <p className="text-[11px] font-medium text-gray-500 tracking-wider uppercase mt-1">Bahir Dar University</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.href = "/feed"}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200/60 shadow-sm hover:shadow-md transition-all group"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-bold text-gray-700 tracking-wide">LIVE</span>
            <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-2xl mx-auto px-5 py-8 sm:py-12">
        {/* Dynamic Hero */}
        <div className="text-center mb-10 space-y-3 animate-in slide-in-from-bottom-4 duration-700 fade-in">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Reporting
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Fix <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">campus chaos</span> faster.
          </h1>
          <p className="text-base sm:text-lg text-slate-500 max-w-md mx-auto leading-relaxed">
            Report issues in Amharic, English, or slang. GibiPulse AI routes it instantly to the right team.
          </p>
        </div>

        {/* Floating Form Card */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] border border-gray-100 mb-10 animate-in slide-in-from-bottom-8 duration-700 delay-100 fade-in relative hover:shadow-[0_16px_60px_-15px_rgba(0,0,0,0.1)] transition-shadow duration-500">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2 group">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest group-focus-within:text-blue-600 transition-colors">
                Student ID
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="e.g. 1602534"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="pl-4 h-12 bg-gray-50/50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl font-mono text-sm transition-all"
                  maxLength={10}
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="space-y-2 group">
              <div className="flex justify-between items-end">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest group-focus-within:text-blue-600 transition-colors">
                  Describe the issue
                </label>
                <span className={`text-[#A0AEC0] text-xs font-medium transition-colors ${message.length > 400 ? 'text-amber-500' : ''}`}>
                  {message.length}/500
                </span>
              </div>
              <div className="relative">
                <Textarea
                  placeholder={'What\'s broken, and where?\n\nExamples:\n- "Abdisa aga wuha tefa, can\'t wash hands"\n- "Main lib wifi down complete outage"'}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className={`min-h-[140px] resize-none text-[15px] p-4 bg-gray-50/50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all leading-relaxed ${isFocused ? 'shadow-inner' : ''}`}
                  maxLength={500}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !studentId || !message}
              className="w-full h-14 rounded-xl text-base font-semibold transition-all group overflow-hidden relative shadow-lg shadow-blue-500/25 bg-gray-900 hover:bg-black text-white hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                  <span className="text-gray-300">AI Processing...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Send className="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform duration-300" />
                  Submit Report Instantly
                </div>
              )}
            </Button>
          </form>
        </div>

        {/* Express Options */}
        <div className="mb-12 animate-in slide-in-from-bottom-10 duration-700 delay-200 fade-in">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Quick Report Examples</h3>
            <div className="h-px bg-gray-200 flex-1 rounded-full"></div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {EXAMPLE_REPORTS.map((example, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleExampleClick(example)}
                className="text-left text-xs font-medium text-gray-600 bg-white border border-gray-200/80 rounded-full px-4 py-2 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all shadow-sm active:scale-95 line-clamp-1 max-w-[90%]"
                title={example}
              >
                &ldquo;{example}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Live Ticker Feed */}
        {recentIssues.length > 0 && (
          <div className="animate-in slide-in-from-bottom-12 duration-700 delay-300 fade-in">
             <div className="flex items-center gap-3 mb-4">
              <Activity className="w-4 h-4 text-gray-400" />
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Campus Intelligence</h3>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-3">
              {recentIssues.map((issue, i) => {
                const typeConfig = ISSUE_TYPE_CONFIG[issue.type as keyof typeof ISSUE_TYPE_CONFIG];
                const sevConfig = SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG];
                return (
                  <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-gray-200 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base ${typeConfig?.bg}`}>
                         {typeConfig?.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{typeConfig?.label}</p>
                        <p className="text-xs font-medium text-gray-400 truncate mt-0.5">{issue.location}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0 pl-2">
                       <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 rounded-sm border ${sevConfig?.bg}`}>
                         {sevConfig?.label}
                       </span>
                       <span className="text-[10px] font-medium text-gray-400">{timeAgo(issue.time)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
