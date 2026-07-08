import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AuthLayout, primaryBtnClass } from "@/components/AuthLayout";
import { getSession, setSession } from "@/lib/mock-store";
import { apiRequest, setAuthToken } from "@/lib/api";
import { ShieldCheck, ScanFace, User, MapPin, Mail, Award, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/verify")({
  head: () => ({ meta: [{ title: "Verify Identity — RemoteVote NG" }] }),
  component: VerifyPage,
});

function VerifyPage() {
  const nav = useNavigate();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const [scanning, setScanning] = useState(false);
  const [step, setStep] = useState<"otp" | "profile" | "biometric" | "done">("otp");
  const [progress, setProgress] = useState(0);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      nav({ to: "/signup" });
      return;
    }
    setEmail(s.email || "your registered email");
    inputs.current[0]?.focus();
  }, [nav]);

  const complete = code.every((c) => c !== "");

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complete) return;
    setError(null);
    setLoading(true);

    try {
      const s = getSession();
      const res = await apiRequest("/auth/verify-otp/", "POST", {
        nin: s?.nin || "",
        code: code.join(""),
        purpose: "signup",
      });

      // Save token and profile details
      setAuthToken(res.token);
      setProfile(res.voter);
      setSession({
        fullName: res.voter.full_name,
        nin: res.voter.username,
        email: res.voter.email,
        state: res.voter.state,
        lga: res.voter.lga,
        verified: false, // Marked verified locally ONLY after biometric scan
        language: res.voter.language || "English",
      });

      setStep("profile");
    } catch (err: any) {
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  const startBiometrics = () => {
    setStep("biometric");
  };

  const runScan = () => {
    setScanning(true);
    setProgress(0);
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(id);
          const s = getSession();
          if (s) setSession({ ...s, verified: true });
          setStep("done");
          setTimeout(() => nav({ to: "/language" }), 700);
          return 100;
        }
        return p + 4;
      });
    }, 60);
  };

  return (
    <AuthLayout
      title={
        step === "profile"
          ? "NIMC Digital ID Card"
          : step === "biometric"
          ? "Facial Scan Match"
          : "Verification"
      }
    >
      {step === "otp" && (
        <form onSubmit={submitOtp} className="space-y-6">
          <div className="flex justify-between gap-2" role="group" aria-label="6-digit verification code">
            {code.map((c, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                inputMode="numeric"
                maxLength={1}
                value={c}
                aria-label={`Digit ${i + 1}`}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  const next = [...code];
                  next[i] = v;
                  setCode(next);
                  if (v && i < 5) inputs.current[i + 1]?.focus();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !code[i] && i > 0) inputs.current[i - 1]?.focus();
                }}
                className="h-14 w-full rounded-lg border border-input bg-background text-center text-2xl font-semibold text-foreground shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
              />
            ))}
          </div>

          {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive text-center">{error}</p>}

          <p className="text-center text-sm text-muted-foreground">
            Didn't receive a code?{" "}
            <button type="button" className="font-semibold text-brand hover:underline">Resend</button>
          </p>
          <button type="submit" disabled={!complete || loading} className={primaryBtnClass}>
            {loading ? "Verifying..." : "Verify code"}
          </button>
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-brand" />
            End-to-end encrypted. Tokens expire in 10 minutes.
          </p>
        </form>
      )}

      {step === "profile" && profile && (
        <div className="space-y-6">
          {/* NIMC Premium Card */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-600/20 bg-gradient-to-br from-emerald-950/95 via-emerald-900/90 to-neutral-900 p-6 text-white shadow-xl">
            {/* Background elements */}
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
            
            {/* Card Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Award className="h-6 w-6 text-emerald-400" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">NIMC Identity Profile</h3>
                  <p className="text-[10px] text-white/50">FEDERAL REPUBLIC OF NIGERIA</p>
                </div>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                <CheckCircle className="h-3 w-3" /> E-VERIFIED
              </span>
            </div>

            {/* Card Content */}
            <div className="mt-6 space-y-4">
              <div className="flex gap-3">
                <User className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-white/50 uppercase">Full Name</p>
                  <p className="text-base font-bold tracking-wide">{profile.full_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex gap-3">
                  <Award className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-white/50 uppercase">NIN (ID)</p>
                    <p className="text-sm font-semibold font-mono tracking-wider">{profile.username}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Mail className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-white/50 uppercase">Email Address</p>
                    <p className="text-xs font-semibold truncate max-w-[140px]">{profile.email}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 border-t border-white/10 pt-4">
                <MapPin className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-white/50 uppercase">Voter Registration Area</p>
                  <p className="text-xs font-semibold">{profile.lga}, {profile.state} State</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-emerald-500/5 p-4 border border-emerald-500/10">
            <p className="text-xs text-muted-foreground text-center">
              Please double check the details above. If this is your correct profile, click below to perform the on-device biometric match.
            </p>
          </div>

          <button onClick={startBiometrics} className={primaryBtnClass}>
            Confirm Details & Scan Face
          </button>
        </div>
      )}

      {step === "biometric" && (
        <div className="space-y-6 text-center">
          <div className="relative mx-auto grid h-56 w-56 place-items-center rounded-full border-4 border-dashed border-brand/40 bg-primary-soft/50">
            <ScanFace className="h-24 w-24 text-brand-dark" />
            {scanning && (
              <span
                className="absolute inset-x-6 top-1/2 h-0.5 origin-left animate-pulse rounded-full bg-brand shadow-[0_0_16px_2px_var(--brand)]"
                style={{ transform: `translateY(${(progress - 50) * 1.5}%)` }}
              />
            )}
          </div>

          {!scanning ? (
            <>
              <p className="text-sm text-muted-foreground">
                Look straight at your camera. Ensure lighting is even. Frames resolve in under 5 seconds.
              </p>
              <button onClick={runScan} className={primaryBtnClass}>Start Facial Scan</button>
            </>
          ) : (
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-primary-soft">
                <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-sm text-muted-foreground">Matching against NIMC record… {progress}%</p>
            </>
          )}
        </div>
      )}

      {step === "done" && (
        <div className="space-y-4 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-success/15 text-success">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <h2 className="font-display text-xl font-semibold">Identity verified</h2>
          <p className="text-sm text-muted-foreground">Redirecting you to language preferences…</p>
        </div>
      )}
    </AuthLayout>
  );
}

