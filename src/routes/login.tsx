import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout, FormField, inputClass, primaryBtnClass } from "@/components/AuthLayout";
import { getSession, setSession } from "@/lib/mock-store";
import { apiRequest, setAuthToken } from "@/lib/api";

export const Route = createFileRoute("/login")({
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Determine what kind of identifier was entered:
   *  - 19-char alphanumeric starting with 3 letters  → VIN (Voter ID)
   *  - starts with a letter (INEC/... or STAFF-...)   → Staff Number
   *  - 11 digits                                      → NIN fallback
   */
  const getLoginPayload = (id: string, pwd: string) => {
    const trimmed = id.trim();
    // VIN: e.g. LAG1234567890123IK (3 alpha + 13 digits + 2 alpha = 18 chars)
    // Or shorter VRN-style: LAG12345678AB (3 alpha + 8 digits + 2 alpha = 13 chars)
    if (/^[A-Za-z]{2,3}\d+[A-Za-z]{1,2}$/.test(trimmed)) {
      return { voter_id: trimmed, password: pwd };
    }
    // Staff number
    if (/^[A-Za-z]/.test(trimmed)) {
      return { staff_id: trimmed, password: pwd };
    }
    // NIN fallback (legacy / staff who have NIN stored as username)
    return { nin: trimmed, password: pwd };
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError("Please enter your Voter ID, Staff Number, or NIN.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const payload = getLoginPayload(trimmed, password);
      const res = await apiRequest("/auth/login/", "POST", payload);

      setAuthToken(res.token);

      // Backend returns either res.voter or res.staff depending on role
      const userData = res.voter || res.staff;
      setSession({
        fullName: userData.full_name || userData.username,
        nin: userData.username,
        email: userData.email,
        state: userData.state || "",
        lga: userData.lga || "",
        verified: userData.is_verified,
        language: userData.language || "English",
        role: userData.role,
        staffNumber: userData.staff_number,
        voterId: userData.voter_id,
      });

      if (userData.is_verified) {
        navigate({ to: "/dashboard" });
      } else {
        navigate({ to: "/verify" });
      }
    } catch (err: any) {
      if (err.message?.includes("not verified")) {
        setSession({
          fullName: "Voter",
          nin: identifier.trim(),
          state: "",
          lga: "",
          verified: false,
          language: "English",
        });
        navigate({ to: "/verify" });
      } else {
        setError(err.message || "Invalid credentials. Please check your details and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Enter your Voter ID (VIN), Staff Number, or NIN to continue your secure session."
      footer={
        <div className="font-semibold text-[16px] md:text-[18px]">
          Don't have an account?{" "}
          <Link to="/signup" className="text-brand hover:underline">
            Create Account
          </Link>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          label="Voter ID / Staff Number / NIN"
          hint="Voters: enter your VIN (e.g. LAG1234567890123IK). Staff: enter your Staff Number."
        >
          <input
            id="login-identifier"
            placeholder="e.g. LAG12345678901IK  or  INEC/LAG/PO/2026/123456"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className={`${inputClass} font-mono tracking-wide`}
            autoComplete="username"
            aria-label="Voter ID, Staff Number or NIN"
          />
        </FormField>

        <FormField label="Password">
          <input
            id="login-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            autoComplete="current-password"
          />
        </FormField>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center mb-[32px] text-[16px] lg:text-[18px] font-bold justify-end">
          <Link to="/forgot" className="text-brand hover:underline">
            Forgot password?
          </Link>
        </div>

        <button
          id="login-submit"
          type="submit"
          disabled={loading}
          className={primaryBtnClass}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}
