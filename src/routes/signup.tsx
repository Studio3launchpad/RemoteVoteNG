import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout, FormField, inputClass, primaryBtnClass } from "@/components/AuthLayout";
import { setSession } from "@/lib/mock-store";
import { apiRequest, setAuthToken } from "@/lib/api";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create Account — RemoteVote NG" }] }),
  component: SignUpPage,
});

type Step = "verify" | "register";

interface VrnInfo {
  full_name: string;
  state: string;
  lga: string;
  ward: string;
}

function SignUpPage() {
  const nav = useNavigate();

  // Step 1 — VRN + NIN lookup
  const [step, setStep] = useState<Step>("verify");
  const [lookup, setLookup] = useState({ nin: "", vrn: "" });
  const [vrnInfo, setVrnInfo] = useState<VrnInfo | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Step 2 — Set password
  const [form, setForm] = useState({ password: "", confirm_password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Step 1: Verify VRN + NIN ──────────────────────────────────────────────
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{11}$/.test(lookup.nin)) return setLookupError("NIN must be exactly 11 digits.");
    if (!lookup.vrn.trim()) return setLookupError("Voter Registration Number (VRN) is required.");

    setLookupError(null);
    setLookupLoading(true);
    try {
      const res = await apiRequest("/auth/vrn-lookup/", "POST", {
        nin: lookup.nin,
        vrn: lookup.vrn.trim().toUpperCase(),
      });
      setVrnInfo(res);
      setStep("register");
    } catch (err: any) {
      setLookupError(err.message || "Verification failed. Check your NIN and VRN.");
    } finally {
      setLookupLoading(false);
    }
  };

  // ── Step 2: Complete registration ─────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirm_password) return setError("Passwords do not match.");

    setError(null);
    setLoading(true);
    try {
      const response = await apiRequest("/auth/register/", "POST", {
        nin: lookup.nin,
        vrn: lookup.vrn.trim().toUpperCase(),
        password: form.password,
      });

      const requiresOtp = response.requires_otp !== false;

      // Handle the case where no email was provided and the user was auto-verified
      if (!requiresOtp && response.token) {
        setAuthToken(response.token);
        setSession({
          fullName: response.voter?.full_name || response.full_name,
          nin: lookup.nin,
          state: response.state || "",
          lga: response.lga || "",
          verified: true,
          language: "English",
          role: "voter",
          voterId: response.voter_id,
        });
        nav({ to: "/dashboard" });
        return;
      }

      setSession({
        fullName: response.full_name,
        nin: lookup.nin,
        state: response.state || "",
        lga: response.lga || "",
        verified: false,
        language: "English",
      });

      nav({ to: "/verify" });
    } catch (err: any) {
      setError(err.message || "Registration failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  // ── Render Step 1 ─────────────────────────────────────────────────────────
  if (step === "verify") {
    return (
      <AuthLayout
        title="Verify Your Identity"
        subtitle="Enter your NIN and Voter Registration Number (VRN) exactly as printed on your Permanent Voter Card (PVC)."
        footer={
          <div className="font-semibold text-[16px] md:text-[18px]">
            Already have an account?{" "}
            <Link to="/login" className="text-brand hover:underline">Sign in</Link>
          </div>
        }
      >
        <form onSubmit={handleLookup} className="space-y-4">
          <FormField
            label="National Identification Number (NIN)"
            hint="11-digit NIN issued by NIMC."
          >
            <input
              id="signup-nin"
              inputMode="numeric"
              maxLength={11}
              value={lookup.nin}
              onChange={(e) => setLookup({ ...lookup, nin: e.target.value.replace(/\D/g, "") })}
              placeholder="e.g. 12345678901"
              className={inputClass}
            />
          </FormField>

          <FormField
            label="Voter Registration Number (VRN)"
            hint="Printed on the back of your Permanent Voter Card (PVC). e.g. LAG12345678AB"
          >
            <input
              id="signup-vrn"
              value={lookup.vrn}
              onChange={(e) => setLookup({ ...lookup, vrn: e.target.value.toUpperCase() })}
              placeholder="e.g. LAG12345678AB"
              className={`${inputClass} uppercase tracking-widest`}
            />
          </FormField>

          {lookupError && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {lookupError}
            </p>
          )}

          <button type="submit" disabled={lookupLoading} className={primaryBtnClass}>
            {lookupLoading ? "Checking INEC Voter Register…" : "Verify Identity →"}
          </button>
        </form>
      </AuthLayout>
    );
  }

  // ── Render Step 2 ─────────────────────────────────────────────────────────
  return (
    <AuthLayout
      title="Create Your Account"
      subtitle="Your identity has been verified. Set up your password to complete registration."
      footer={
        <div className="font-semibold text-[16px] md:text-[18px]">
          <button onClick={() => setStep("verify")} className="text-brand hover:underline">
            ← Change NIN / VRN
          </button>
        </div>
      }
    >
      {/* Verified identity banner */}
      {vrnInfo && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 mb-4">
          <p className="text-xs text-green-400 font-semibold uppercase tracking-wider mb-1">
            ✓ Identity Verified
          </p>
          <p className="text-sm font-bold text-foreground">{vrnInfo.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {vrnInfo.lga}, {vrnInfo.state}{vrnInfo.ward ? ` — ${vrnInfo.ward}` : ""}
          </p>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <FormField label="Create Password" hint="Minimum 6 characters.">
          <input
            id="signup-password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Enter a strong password"
            className={inputClass}
          />
        </FormField>

        <FormField label="Confirm Password" hint="Re-type your password.">
          <input
            id="signup-confirm-password"
            type="password"
            value={form.confirm_password}
            onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
            placeholder="Re-enter your password"
            className={inputClass}
          />
        </FormField>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className={primaryBtnClass}>
          {loading ? "Creating Account…" : "Create Account"}
        </button>
      </form>
    </AuthLayout>
  );
}
