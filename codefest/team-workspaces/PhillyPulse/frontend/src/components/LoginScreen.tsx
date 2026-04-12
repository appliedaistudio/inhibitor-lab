"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

type Mode = "login" | "signup";

export default function LoginScreen() {
  const {
    user,
    signInWithGoogle,
    signInAsGuest,
    signUpWithEmail,
    signInWithEmail,
    resendVerification,
  } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const needsVerification = user && !user.isAnonymous && user.email && !user.emailVerified;

  if (needsVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--map-bg, #0a0a14)" }}>
        <div
          className="w-full max-w-sm rounded-2xl p-8 space-y-6 backdrop-blur-xl shadow-2xl"
          style={{ background: "var(--panel-bg, rgba(255,255,255,0.05))", border: "1px solid var(--panel-border, rgba(255,255,255,0.1))" }}
        >
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <Mail className="w-12 h-12 text-blue-500" />
            </div>
            <h1 className="text-xl font-bold" style={{ color: "var(--panel-text, white)" }}>Check your email</h1>
            <p className="text-sm" style={{ color: "var(--panel-text-secondary, #999)" }}>
              We sent a verification link to <strong>{user.email}</strong>. Click it to activate your account.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={async () => {
                try {
                  await resendVerification();
                  setVerificationSent(true);
                } catch { setError("Failed to resend."); }
              }}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: "var(--panel-input-bg, rgba(255,255,255,0.05))", color: "var(--panel-text, white)", border: "1px solid var(--panel-border, rgba(255,255,255,0.1))" }}
            >
              Resend verification email
            </button>
            {verificationSent && (
              <div className="flex items-center gap-2 text-xs text-green-500">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verification email sent!
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-blue-500 transition-colors hover:bg-blue-500/10"
            >
              I&apos;ve verified — refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg.includes("email-already-in-use")) setError("An account with this email already exists.");
      else if (msg.includes("wrong-password") || msg.includes("invalid-credential")) setError("Invalid email or password.");
      else if (msg.includes("user-not-found")) setError("No account found with this email.");
      else if (msg.includes("weak-password")) setError("Password must be at least 6 characters.");
      else if (msg.includes("invalid-email")) setError("Please enter a valid email address.");
      else if (msg.includes("too-many-requests")) setError("Too many attempts. Try again later.");
      else setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--map-bg, #0a0a14)" }}>
      <div
        className="w-full max-w-sm rounded-2xl p-8 space-y-6 backdrop-blur-xl shadow-2xl"
        style={{ background: "var(--panel-bg, rgba(255,255,255,0.05))", border: "1px solid var(--panel-border, rgba(255,255,255,0.1))" }}
      >
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <img src="/logo.png" alt="PHLPulse" className="w-12 h-12" />
            <span className="text-2xl font-bold tracking-tight" style={{ color: "var(--panel-text, white)" }}>PHLPulse</span>
          </div>
          <p className="text-xs" style={{ color: "var(--panel-text-muted, #666)" }}>
            AI-Powered Community Safety for Philadelphia
          </p>
        </div>

        {/* Google sign-in */}
        <button
          onClick={async () => {
            setError("");
            try { await signInWithGoogle(); } catch (err: unknown) {
              if (err instanceof Error && !err.message.includes("popup-closed")) setError("Google sign-in failed.");
            }
          }}
          className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:brightness-110"
          style={{ background: "var(--panel-input-bg, rgba(255,255,255,0.05))", color: "var(--panel-text, white)", border: "1px solid var(--panel-border, rgba(255,255,255,0.1))" }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "var(--panel-border, rgba(255,255,255,0.1))" }} />
          <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--panel-text-muted, #666)" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "var(--panel-border, rgba(255,255,255,0.1))" }} />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors placeholder:opacity-40"
              style={{
                background: "var(--panel-input-bg, rgba(255,255,255,0.05))",
                color: "var(--panel-text, white)",
                border: "1px solid var(--panel-border, rgba(255,255,255,0.1))",
              }}
            />
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors pr-10 placeholder:opacity-40"
              style={{
                background: "var(--panel-input-bg, rgba(255,255,255,0.05))",
                color: "var(--panel-text, white)",
                border: "1px solid var(--panel-border, rgba(255,255,255,0.1))",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-70 transition-opacity"
              style={{ color: "var(--panel-text, white)" }}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: "#3b82f6", color: "white" }}
          >
            {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        {/* Toggle login/signup */}
        <p className="text-center text-xs" style={{ color: "var(--panel-text-muted, #666)" }}>
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button onClick={() => { setMode("signup"); setError(""); }} className="text-blue-500 font-medium hover:underline">
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => { setMode("login"); setError(""); }} className="text-blue-500 font-medium hover:underline">
                Sign in
              </button>
            </>
          )}
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "var(--panel-border, rgba(255,255,255,0.1))" }} />
          <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--panel-text-muted, #666)" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "var(--panel-border, rgba(255,255,255,0.1))" }} />
        </div>

        {/* Guest */}
        <button
          onClick={async () => {
            setError("");
            try { await signInAsGuest(); } catch { setError("Guest sign-in failed."); }
          }}
          className="w-full py-2.5 rounded-lg text-xs font-medium transition-colors hover:brightness-110"
          style={{ color: "var(--panel-text-secondary, #999)" }}
        >
          Continue as Guest
          <span className="block text-[10px] mt-0.5 opacity-50">No account needed · no saved history</span>
        </button>
      </div>
    </div>
  );
}
