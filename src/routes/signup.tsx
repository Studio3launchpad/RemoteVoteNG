import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout, FormField, inputClass, primaryBtnClass } from "@/components/AuthLayout";
import { setSession } from "@/lib/mock-store";
import { apiRequest } from "@/lib/api";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create Account — RemoteVote NG" }] }),
  component: SignUpPage,
});

function SignUpPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({ nin: "", email: "", password: "", confirm_password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{11}$/.test(form.nin)) return setError("NIN must be exactly 11 digits.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirm_password) return setError("Password does not match");
    
    setError(null);
    setLoading(true);

    try {
      const response = await apiRequest("/auth/register/", "POST", {
        nin: form.nin,
        email: form.email,
        password: form.password,
      });

      // Save a temporary session with returned info (will be fully verified after OTP)
      setSession({
        fullName: response.full_name,
        nin: response.nin,
        email: response.email,
        state: "", // Will be filled upon OTP validation
        lga: "",
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

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Register once to vote securely from anywhere. Your details are verified with NIMC."
      footer={
        <div className="font-semibold text-[16px] md:text-[18px] hover:underline">
          Already have an account?{" "}
          <Link to="/" className="text-brand">Sign in</Link>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <FormField label="National Identification Number (NIN)" hint="11-digit NIN issued by NIMC.">
          <input
            inputMode="numeric"
            maxLength={11}
            value={form.nin}
            onChange={(e) => setForm({ ...form, nin: e.target.value.replace(/\D/g, "") })}
            placeholder="11-digit NIN"
            className={inputClass}
          />
        </FormField>
        <FormField label="Email" hint="We'll send a verification code to this email.">
          <input
            inputMode="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Enter your email"
            className={inputClass}
          />
        </FormField>
        
        <FormField label="Create Password" hint="Minimum 6 characters.">
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Enter a strong password"
            className={inputClass}
          />
        </FormField>

        <FormField label="Confirm Password" hint="Re-type Password">
          <input
            type="password"
            value={form.confirm_password}
            onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
            placeholder="Please Re-enter Password"
            className={inputClass}
          />
        </FormField>

        {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <button type="submit" disabled={loading} className={primaryBtnClass}>
          {loading ? "Registering with NIMC..." : "Create Account"}
        </button>
      </form>
    </AuthLayout>
  );
}

