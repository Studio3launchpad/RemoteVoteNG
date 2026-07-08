import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout, FormField, inputClass, primaryBtnClass } from "@/components/AuthLayout";
import { getSession, setSession } from "@/lib/mock-store";
import { apiRequest, setAuthToken } from "@/lib/api";

export const Route = createFileRoute("/")({
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [nin, setNin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const isStaff = /^[a-zA-Z]/.test(nin);
    if (!isStaff && !/^\d{11}$/.test(nin)) {
      setError("Please enter a valid 11-digit NIN or Staff Number.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);

    try {
      const res = await apiRequest("/auth/login/", "POST", {
        nin,
        password,
      });

      // Successful login
      setAuthToken(res.token);
      setSession({
        fullName: res.voter.full_name,
        nin: res.voter.username,
        email: res.voter.email,
        state: res.voter.state,
        lga: res.voter.lga,
        verified: res.voter.is_verified,
        language: res.voter.language || "English",
      });

      if (res.voter.is_verified) {
        navigate({ to: "/dashboard" });
      } else {
        navigate({ to: "/verify" });
      }
    } catch (err: any) {
      // Check if user is unverified and needs to be redirected to verification screen
      if (err.message && err.message.includes("not verified")) {
        // Find if unverified data is returned (the fetch returns error, but we want to inspect response or parameters)
        // Since apiRequest throws an error on non-200, if backend returns 403 with user email,
        // we can save session. To keep it simple, we can set temporary session using input fields
        setSession({
          fullName: "Voter", // fallback
          nin,
          state: "",
          lga: "",
          verified: false,
          language: "English",
        });
        navigate({ to: "/verify" });
      } else {
        setError(err.message || "Invalid NIN or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Enter your NIN and password to continue your secure session."
      footer={
        <div className="font-semibold text-[16px] md:text-[18px] hover:underline">
          Don't have an account?{" "}
          <Link to="/signup" className="text-brand">
            Create Account
          </Link>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="NIN or Staff Number" hint="Enter your 11-digit NIN or your INEC Staff ID.">
          <input
            placeholder="e.g. 11111111111 or STAFF-PO"
            value={nin}
            onChange={(e) => setNin(e.target.value)}
            className={inputClass}
            aria-invalid={error?.includes("NIN") || undefined}
          />
        </FormField>
        <FormField label="Password">
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </FormField>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center mb-[32px] text-[16px] lg:text-[18px] font-bold justify-end">
          <Link to="/forgot" className="text-brand hover:underline">Forgot password?</Link>
        </div>

        <button type="submit" disabled={loading} className={primaryBtnClass}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}

