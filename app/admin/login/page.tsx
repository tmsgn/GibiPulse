"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Zap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Invalid credentials. Contact your system administrator.");
        return;
      }

      toast.success("Welcome back, Admin!");
      router.push("/admin");
      router.refresh();
    } catch {
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
             <img src="/bdu-full-logo.png" alt="Bahir Dar University" className="h-20 w-auto object-contain dark:invert transition-all" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-foreground to-foreground/70">
            GibiPulse
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Admin Control Panel</p>
        </div>

        {/* Card */}
        <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium text-foreground">Staff Login</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="admin@bdu.edu.et"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-background border-border text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-background border-border text-foreground"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full h-11 gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          For access, contact BDU IT Department
        </p>
      </div>
    </div>
  );
}
