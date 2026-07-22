import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout, primaryBtnClass, inputClass, FormField } from "@/components/AuthLayout";
import { apiRequest } from "@/lib/api";

export const Route = createFileRoute("/forgot")({
  head: () => ({ meta: [{ title: "Forgot Password — RemoteVote NG" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const nav = useNavigate();
  const [nin, setNin] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{11}$/.test(nin)) {
      setError("NIN must be exactly 11 digits.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest("/auth/forgot-password/", "POST", { nin });
      setEmail(res.email);
      setStep("reset");
    } catch (err: any) {
      setError(err.message || "Failed to send reset code. Please check your NIN.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Verification code must be exactly 6 digits.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await apiRequest("/auth/reset-password/", "POST", {
        nin,
        code,
        password,
      });
      setSuccess(true);
      setTimeout(() => nav({ to: "/" }), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Check the code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle={
        success
          ? "Your password has been reset successfully."
          : step === "request"
          ? "Enter your NIN and we'll send a reset code to your registered email address."
          : `We've sent a 6-digit verification code to ${email}.`
      }
      footer={<><Link to="/login" className="font-semibold text-brand hover:underline">Back to sign in</Link></>}
    >
      {success ? (
        <div className="rounded-lg bg-emerald-500/10 p-4 border border-emerald-500/20 text-center">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            Password reset successful!
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Redirecting you to the sign in page...
          </p>
        </div>
      ) : step === "request" ? (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <FormField label="National Identification Number (NIN)">
            <input
              inputMode="numeric"
              maxLength={11}
              value={nin}
              onChange={(e) => setNin(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter your 11-digit NIN"
              className={inputClass}
            />
          </FormField>
          
          {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <button type="submit" disabled={loading} className={primaryBtnClass}>
            {loading ? "Sending code..." : "Send reset code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <FormField label="Verification Code" hint="Enter the 6-digit code sent to your email.">
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 123456"
              className={inputClass}
            />
          </FormField>

          <FormField label="New Password" hint="Minimum 6 characters.">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              className={inputClass}
            />
          </FormField>

          <FormField label="Confirm New Password">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className={inputClass}
            />
          </FormField>

          {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <button type="submit" disabled={loading} className={primaryBtnClass}>
            {loading ? "Resetting password..." : "Reset Password"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

