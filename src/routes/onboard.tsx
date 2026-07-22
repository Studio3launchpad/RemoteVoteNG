import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { apiRequest } from "../lib/api";

export const Route = createFileRoute("/onboard")({
  component: OnboardPage,
});

type Step = "validating" | "form" | "success" | "error";

interface InvitationDetails {
  email: string;
  staff_number: string;
  role: string;
  role_display: string;
  expires_at: string;
}

const ROLE_ICONS: Record<string, string> = {
  po: "🗳️",
  apo: "📋",
  spo: "🏢",
  co: "📊",
  ro: "⚖️",
  auditor: "🔍",
  media: "📰",
  observer: "👁️",
};

function OnboardPage() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get("token") || "";

  const [step, setStep] = useState<Step>("validating");
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [nin, setNin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ninError, setNinError] = useState("");
  const [passError, setPassError] = useState("");
  const [successData, setSuccessData] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setStep("error");
      setErrorMsg("No invitation token found. Please use the link from your email.");
      return;
    }

    (async () => {
      try {
        const data = await apiRequest<InvitationDetails>(`/onboarding/accept/${token}/`, "GET");
        setInvitation(data);
        setStep("form");
      } catch (err: any) {
        setStep("error");
        setErrorMsg(err?.message || "This invitation is invalid, expired, or has already been used.");
      }
    })();
  }, [token]);

  const validateNin = (val: string) => {
    if (!val) return "NIN is required";
    if (!/^\d{11}$/.test(val)) return "NIN must be exactly 11 digits";
    return "";
  };

  const validatePassword = (val: string, confirm: string) => {
    if (!val) return "Password is required";
    if (val.length < 6) return "Password must be at least 6 characters";
    if (confirm && val !== confirm) return "Passwords do not match";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ne = validateNin(nin);
    const pe = validatePassword(password, confirmPassword);
    setNinError(ne);
    setPassError(pe);
    if (ne || pe) return;

    setLoading(true);
    try {
      const data = await apiRequest<any>(`/onboarding/accept/${token}/`, "POST", { nin, password });
      setSuccessData({ name: data.voter.full_name, role: data.voter.role });
      setStep("success");
    } catch (err: any) {
      setPassError(err?.message || "Account activation failed. Please contact INEC ICT Support.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboard-page">
      <div className="onboard-card">
        <div className="onboard-logo">
          <div className="onboard-logo-icon">⚡</div>
          <span>RemoteVote NG</span>
        </div>

        {step === "validating" && (
          <div className="onboard-loading">
            <div className="spinner-lg" />
            <p>Validating your invitation…</p>
          </div>
        )}

        {step === "error" && (
          <div className="onboard-error-state">
            <div className="onboard-error-icon">🔒</div>
            <h1>Invitation Invalid</h1>
            <p>{errorMsg}</p>
            <Link to="/" className="btn-primary-full">Return to Home</Link>
          </div>
        )}

        {step === "form" && invitation && (
          <>
            <div className="onboard-header">
              <div className="role-badge-large">
                <span>{ROLE_ICONS[invitation.role] || "🏛️"}</span>
                <strong>{invitation.role_display}</strong>
              </div>
              <h1>Activate Your INEC Account</h1>
              <p>
                You have been invited to join RemoteVote NG as a <strong>{invitation.role_display}</strong>.
                Complete the form below to set up your secure account.
              </p>
            </div>

            <div className="invitation-details">
              <div className="inv-row">
                <span className="inv-label">📧 Email</span>
                <span className="inv-val">{invitation.email}</span>
              </div>
              <div className="inv-row">
                <span className="inv-label">🪪 Staff ID</span>
                <span className="inv-val">{invitation.staff_number}</span>
              </div>
              <div className="inv-row">
                <span className="inv-label">⏰ Expires</span>
                <span className="inv-val">{new Date(invitation.expires_at).toLocaleDateString()}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="onboard-form">
              <div className="form-group">
                <label htmlFor="onboard-nin">National Identification Number (NIN)</label>
                <input
                  id="onboard-nin"
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="Enter your 11-digit NIN"
                  value={nin}
                  onChange={(e) => { setNin(e.target.value); setNinError(""); }}
                  className={ninError ? "input-error" : ""}
                />
                {ninError && <span className="field-error">{ninError}</span>}
                <small>Your NIN will be cross-checked with the NIMC national identity database.</small>
              </div>

              <div className="form-group">
                <label htmlFor="onboard-pass">Create Password</label>
                <div className="password-wrap">
                  <input
                    id="onboard-pass"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPassError(""); }}
                    className={passError ? "input-error" : ""}
                  />
                  <button type="button" className="toggle-pass" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="onboard-confirm">Confirm Password</label>
                <input
                  id="onboard-confirm"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPassError(""); }}
                />
                {passError && <span className="field-error">{passError}</span>}
              </div>

              <button type="submit" disabled={loading} className="btn-activate">
                {loading ? <><span className="spinner-sm" /> Activating Account…</> : "🔓 Activate My Account"}
              </button>
            </form>

            <p className="onboard-footer">
              Need help? Contact <strong>INEC ICT Support</strong> with your staff number: <code>{invitation.staff_number}</code>
            </p>
          </>
        )}

        {step === "success" && successData && (
          <div className="onboard-success">
            <div className="success-icon-big">✅</div>
            <h1>Account Activated!</h1>
            <p>
              Welcome, <strong>{successData.name}</strong>. Your INEC electoral account has been successfully created.
              You can now log in to the RemoteVote NG portal with your Staff Number and password.
            </p>
            <div className="success-role-badge">
              <span>{ROLE_ICONS[successData.role] || "🏛️"}</span>
              <strong>Assigned Role: {successData.role.toUpperCase()}</strong>
            </div>
            <button onClick={() => navigate({ to: "/" })} className="btn-activate">
              🔐 Go to Login
            </button>
          </div>
        )}
      </div>

      <style>{`
        .onboard-page {
          min-height: 100vh;
          background: radial-gradient(ellipse at top left, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          font-family: 'Inter', sans-serif;
        }

        .onboard-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 1.5rem;
          padding: 2.5rem;
          width: 100%;
          max-width: 480px;
          backdrop-filter: blur(20px);
          box-shadow: 0 25px 60px rgba(0,0,0,0.5);
        }

        .onboard-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 2rem;
          color: #c7d2fe;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .onboard-logo-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
        }

        .onboard-loading {
          text-align: center;
          padding: 3rem 0;
          color: #a5b4fc;
        }

        .onboard-loading p { margin-top: 1.5rem; font-size: 0.95rem; }

        .spinner-lg {
          width: 48px; height: 48px;
          border: 4px solid rgba(99,102,241,0.3);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }

        .spinner-sm {
          display: inline-block;
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 6px;
          vertical-align: middle;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .onboard-error-state, .onboard-success {
          text-align: center;
          padding: 1rem 0;
        }

        .onboard-error-icon, .success-icon-big {
          font-size: 3.5rem;
          margin-bottom: 1.25rem;
        }

        .onboard-error-state h1, .onboard-success h1 {
          color: #e2e8f0;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
        }

        .onboard-error-state p, .onboard-success p {
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        .onboard-header h1 {
          color: #e2e8f0;
          font-size: 1.4rem;
          font-weight: 700;
          margin: 1rem 0 0.5rem;
        }

        .onboard-header p {
          color: #94a3b8;
          font-size: 0.9rem;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        .role-badge-large {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2));
          border: 1px solid rgba(99,102,241,0.4);
          border-radius: 50px;
          padding: 0.5rem 1.25rem;
          color: #c7d2fe;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .invitation-details {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 0.75rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .inv-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .inv-row:last-child { border-bottom: none; }

        .inv-label { color: #64748b; font-size: 0.82rem; }
        .inv-val { color: #c7d2fe; font-size: 0.85rem; font-weight: 500; }

        .onboard-form { display: flex; flex-direction: column; gap: 1.25rem; }

        .form-group { display: flex; flex-direction: column; gap: 0.4rem; }

        .form-group label {
          color: #94a3b8;
          font-size: 0.82rem;
          font-weight: 500;
        }

        .form-group input {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 0.6rem;
          padding: 0.75rem 1rem;
          color: #e2e8f0;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
          width: 100%;
          box-sizing: border-box;
        }

        .form-group input:focus { border-color: #6366f1; }
        .form-group input.input-error { border-color: #ef4444; }

        .form-group small { color: #64748b; font-size: 0.77rem; }

        .field-error { color: #f87171; font-size: 0.8rem; }

        .password-wrap {
          position: relative;
          display: flex;
        }

        .password-wrap input { padding-right: 4.5rem; }

        .toggle-pass {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #6366f1;
          font-size: 0.8rem;
          cursor: pointer;
          font-weight: 600;
        }

        .btn-activate, .btn-primary-full {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border: none;
          border-radius: 0.75rem;
          padding: 0.9rem 1.5rem;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          text-decoration: none;
          transition: opacity 0.2s, transform 0.1s;
          margin-top: 0.5rem;
        }

        .btn-activate:hover, .btn-primary-full:hover { opacity: 0.9; }
        .btn-activate:active { transform: scale(0.98); }
        .btn-activate:disabled { opacity: 0.5; cursor: not-allowed; }

        .onboard-footer {
          text-align: center;
          color: #475569;
          font-size: 0.78rem;
          margin-top: 1.25rem;
        }

        .onboard-footer strong { color: #64748b; }
        .onboard-footer code {
          background: rgba(99,102,241,0.15);
          color: #a5b4fc;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          font-family: monospace;
        }

        .success-role-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(16,185,129,0.15);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 50px;
          padding: 0.5rem 1.25rem;
          color: #34d399;
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
        }
      `}</style>
    </div>
  );
}
