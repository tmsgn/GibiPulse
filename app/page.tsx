"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Send, CheckCircle2, AlertTriangle, ChevronRight, Activity, Camera, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ISSUE_TYPE_CONFIG, SEVERITY_CONFIG, timeAgo } from "@/lib/config";
import type { AnalysisResult } from "@/lib/types";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";

const EXAMPLE_REPORTS = [
  "Abdisa aga wuha tefa again, we can't even wash our hands",
  "Guna dorm mabrat yellem since 6am, exam today",
  "Main library net yelem, can't submit assignment",
  "ውሃ ጠፋ፣ ሻወር መጠቀም አልቻልንም",
  "ማብራት ጠፋ ከዛሬ ጠዋት ጀምሮ",
  "ኢንተርኔት ዛሬ አይሰራም",
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
  const [building, setBuilding] = useState("");
  const [dormNumber, setDormNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [recentIssues, setRecentIssues] = useState<RecentIssue[]>([]);
  const supabase = createClient();

  useEffect(() => {
    setRecentIssues([
      { type: "water", location: "Abdisa Aga Dorm", severity: "high", time: new Date(Date.now() - 4 * 60000).toISOString() },
      { type: "electricity", location: "Block C", severity: "critical", time: new Date(Date.now() - 12 * 60000).toISOString() },
    ]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentId.trim()) { toast.error("Please enter your student ID"); return; }
    if (!building.trim()) { toast.error("Please enter your building name"); return; }
    if (!dormNumber.trim()) { toast.error("Please enter your dorm number"); return; }
    if (!message.trim()) { toast.error("Please describe the issue"); return; }

    setLoading(true);
    setResult(null);

    try {
      let imageUrl = null;

      if (imageFile) {
        toast.info("Uploading evidence...", { duration: 2000 });
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${studentId.trim()}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("report_images").upload(fileName, imageFile);
        if (uploadError) {
          toast.error("Failed to upload image. Submitting without it.");
        } else {
          const { data: publicUrlData } = supabase.storage.from("report_images").getPublicUrl(fileName);
          imageUrl = publicUrlData.publicUrl;
        }
      }

      toast.info("Analyzing your report...", { duration: 3000 });

      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId.trim(),
          building: building.trim(),
          dorm_number: dormNumber.trim(),
          message: message.trim(),
          image_url: imageUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok) { toast.error(data.error ?? "Failed to submit report"); return; }

      setResult(data);
      toast.success("Report submitted successfully!");
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
    window.scrollTo({ top: 100, behavior: "smooth" });
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (result) {
    const issueConfig = ISSUE_TYPE_CONFIG[result.analysis.issue_type];
    const severityConfig = SEVERITY_CONFIG[result.analysis.severity];

    return (
      <div className="min-h-screen bg-background">
        <header className="bg-[#005189] bdu-header-stripe shadow-md">
          <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-white flex items-center justify-center overflow-hidden">
                <img src="/bdu-logo.png" alt="BDU" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <p className="font-bold text-white text-sm leading-none">GibiPulse</p>
                <p className="text-[11px] text-blue-200 mt-0.5">Bahir Dar University</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-5 py-10">
          <div className="bg-card rounded border border-border overflow-hidden shadow-sm">
            <div className="bg-green-600 px-6 py-5 text-white text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2" />
              <h2 className="text-xl font-bold">Report Submitted</h2>
              <p className="text-sm text-green-100 mt-1">Your report has been received and categorized.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="border border-border rounded p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Issue Type</p>
                  <p className="font-semibold text-foreground">{issueConfig.label}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Priority</p>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded border ${severityConfig.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${severityConfig.dot}`} />
                      {severityConfig.label}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Location</p>
                    <p className="font-medium text-foreground text-sm">📍 {result.analysis.location}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded p-4">
                <p className="text-xs font-semibold text-[#005189] dark:text-blue-400 uppercase tracking-wider mb-1">Summary</p>
                <p className="text-sm text-foreground leading-relaxed">{result.analysis.ai_summary}</p>
              </div>

              {result.merged && result.group_count > 1 && (
                <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 rounded p-4 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed">
                    <strong className="font-bold">{result.group_count} students</strong> have reported this. Combined reports increase priority.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={() => { setResult(null); setMessage(""); }}
                  className="w-full h-10 rounded font-medium bg-[#005189] hover:bg-[#003d6b] text-white"
                >
                  Submit Another Report
                </Button>
                <Button
                  onClick={() => window.location.href = "/feed"}
                  variant="outline"
                  className="w-full h-10 rounded font-medium"
                >
                  View Campus Feed
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* BDU motto bar */}
      <div className="bg-[#003d6b] text-white text-xs py-1.5 px-4 text-center">
        <span className="opacity-80">Bahir Dar University — "Wisdom at the Source of the Blue Nile"</span>
      </div>

      {/* Header */}
      <header className="bg-[#005189] bdu-header-stripe shadow-md">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-white flex items-center justify-center overflow-hidden shadow-sm">
              <img src="/bdu-logo.png" alt="BDU Logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <p className="font-bold text-white text-[15px] leading-none">GibiPulse</p>
              <p className="text-[11px] text-blue-200 mt-0.5 tracking-wide">Bahir Dar University — Campus Reporting</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => window.location.href = "/feed"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#FFCC00] text-[#003d6b] hover:bg-yellow-300 transition-colors"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#003d6b] opacity-50" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#003d6b]" />
              </span>
              LIVE FEED
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8">
        {/* Page intro */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <img src="/bdu-full-logo.png" alt="Bahir Dar University" className="h-14 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Campus Issue Report Form</h1>
          <p className="text-sm text-muted-foreground">
            Report infrastructure problems in your dorm or campus facility. Write in English or <span className="font-medium text-foreground">አማርኛ</span>.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-card rounded border border-border shadow-sm mb-8">
          <div className="px-5 py-3 border-b border-border bg-muted/40">
            <h2 className="text-sm font-semibold text-foreground">Student Information &amp; Report</h2>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Student ID */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Student ID <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. 1602534"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="h-10 rounded bg-background border-border focus:border-[#005189] focus:ring-2 focus:ring-[#005189]/20 font-mono text-sm"
                maxLength={10}
                inputMode="numeric"
              />
            </div>

            {/* Building + Dorm */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Building <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Guna"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  className="h-10 rounded bg-background border-border focus:border-[#005189] focus:ring-2 focus:ring-[#005189]/20 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Dorm Number <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 104"
                  value={dormNumber}
                  onChange={(e) => setDormNumber(e.target.value)}
                  className="h-10 rounded bg-background border-border focus:border-[#005189] focus:ring-2 focus:ring-[#005189]/20 text-sm"
                />
              </div>
            </div>

            {/* Issue description */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-foreground">
                  Describe the Issue <span className="text-destructive">*</span>
                </label>
                <span className={`text-xs text-muted-foreground ${message.length > 400 ? "text-destructive" : ""}`}>
                  {message.length}/500
                </span>
              </div>
              <Textarea
                placeholder={"What's the problem? Write in Amharic, English, or both:\n\n• \"Abdisa aga wuha tefa, can't wash hands\"\n• \"ውሃ ጠፋ ሻወር አልሆነልንም\"\n• \"ማብራት ጠፋ ከዛሬ ጠዋት ጀምሮ\""}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`min-h-32 resize-none text-sm p-3 bg-background border-border rounded focus:border-[#005189] focus:ring-2 focus:ring-[#005189]/20 leading-relaxed transition-shadow ${isFocused ? "shadow-inner" : ""}`}
                maxLength={500}
              />
            </div>

            {/* Image upload */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Attach Photo (Optional)
              </label>
              {!imagePreview ? (
                <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-border rounded cursor-pointer bg-muted/20 hover:bg-muted/50 transition-colors gap-2 text-sm text-muted-foreground">
                  <Camera className="w-4 h-4" />
                  <span><span className="font-medium text-[#005189]">Click to upload</span> or drag and drop</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImageFile(e.target.files[0]);
                        setImagePreview(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                  />
                </label>
              ) : (
                <div className="relative w-full overflow-hidden rounded border border-border">
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 z-10 p-1 bg-black/60 hover:bg-black text-white rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Evidence" className="w-full h-36 object-cover" />
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !studentId || !message}
              className="w-full h-11 rounded font-semibold text-sm bg-[#005189] hover:bg-[#003d6b] text-white transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" />
                  Submit Report
                </div>
              )}
            </Button>
          </form>
        </div>

        {/* Quick Examples */}
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Quick Report Examples
          </h3>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_REPORTS.map((example, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleExampleClick(example)}
                className="text-left text-xs text-muted-foreground bg-card border border-border rounded px-3 py-1.5 hover:border-[#005189]/40 hover:text-[#005189] hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors line-clamp-1 max-w-[90%]"
                title={example}
              >
                &ldquo;{example}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Recent Issues */}
        {recentIssues.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Campus Issues</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {recentIssues.map((issue, i) => {
                const typeConfig = ISSUE_TYPE_CONFIG[issue.type as keyof typeof ISSUE_TYPE_CONFIG];
                const sevConfig = SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG];
                return (
                  <div key={i} className="bg-card border border-border rounded p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 text-base ${typeConfig?.bg}`}>
                        {typeConfig?.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{typeConfig?.label}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{issue.location}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 pl-2">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${sevConfig?.bg}`}>
                        {sevConfig?.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(issue.time)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-8">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Bahir Dar University — GibiPulse</span>
          <span>Campus Infrastructure Reporting</span>
        </div>
      </footer>
    </div>
  );
}
