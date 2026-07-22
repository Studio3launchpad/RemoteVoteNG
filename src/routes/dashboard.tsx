import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { getSession } from "@/lib/mock-store";
import React, { useEffect, useState } from "react";
import { apiRequest, Voter, Election } from "@/lib/api";
import { PaginationControls } from "@/components/PaginationControls";
import { 
  CalendarDays, CheckCircle2, ChevronRight, Vote, ShieldCheck, Mail, MapPin, 
  User, Eye, EyeOff, Lock, AlertTriangle, Activity, FileText, Check, Database, 
  Cpu, Clock, PlusCircle, RotateCw, Users, BarChart3, Plus, Search, Shield, Eye as EyeIcon
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Elections — RemoteVote NG" }] }),
  component: DashboardPage,
});

// CSV Export & Import Helper Functions
function exportToCSV(data: any[], headers: string[], displayNames: string[], filename: string) {
  if (data.length === 0) {
    alert("No records to export.");
    return;
  }
  
  const csvRows = [displayNames.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      const escaped = ('' + (val ?? '')).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let col = "";
  let insideQuote = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i+1];
    
    if (char === '"') {
      if (insideQuote && next === '"') {
        col += '"';
        i++; // skip next quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      row.push(col.trim());
      col = "";
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && next === '\n') {
        i++;
      }
      row.push(col.trim());
      result.push(row);
      row = [];
      col = "";
    } else {
      col += char;
    }
  }
  if (col || row.length > 0) {
    row.push(col.trim());
    result.push(row);
  }
  return result;
}

function mapRowToPu(row: string[], headers: string[]): any {
  const obj: any = {};
  headers.forEach((h, idx) => {
    const cleanH = h.toLowerCase().trim();
    const val = row[idx];
    if (cleanH.includes('name') || cleanH.includes('facility')) {
      obj.name = val;
    } else if (cleanH.includes('ward')) {
      obj.ward = val;
    } else if (cleanH.includes('lga') || cleanH.includes('local')) {
      obj.lga = val;
    } else if (cleanH.includes('state')) {
      obj.state = val;
    } else if (cleanH.includes('voters') || cleanH.includes('count')) {
      obj.registered_voters_count = Number(val) || 0;
    } else if (cleanH.includes('code') || cleanH.includes('id')) {
      obj.id = val || undefined;
    }
  });
  return obj;
}

function mapRowToNimc(row: string[], headers: string[]): any {
  const obj: any = {};
  headers.forEach((h, idx) => {
    const cleanH = h.toLowerCase().trim();
    const val = row[idx];
    if (cleanH.includes('nin') || cleanH.includes('national')) {
      obj.nin = val;
    } else if (cleanH.includes('name') || cleanH.includes('full')) {
      obj.full_name = val;
    } else if (cleanH.includes('state')) {
      obj.state = val;
    } else if (cleanH.includes('lga') || cleanH.includes('local')) {
      obj.lga = val;
    } else if (cleanH.includes('biometric') || cleanH.includes('hash')) {
      obj.biometric_hash = val;
    }
  });
  if (!obj.biometric_hash) {
    obj.biometric_hash = 'mock_biometric_hash_' + Math.random().toString(36).substring(7);
  }
  return obj;
}

function mapRowToInvite(row: string[], headers: string[]): any {
  const obj: any = {};
  headers.forEach((h, idx) => {
    const cleanH = h.toLowerCase().trim();
    const val = row[idx];
    if (cleanH.includes('email') || cleanH.includes('mail')) {
      obj.email = val;
    } else if (cleanH.includes('role') || cleanH.includes('position')) {
      obj.role = val?.toLowerCase();
    } else if (cleanH.includes('polling') || cleanH.includes('unit') || cleanH.includes('pu')) {
      obj.polling_unit_id = val || undefined;
    }
  });
  return obj;
}

function DashboardPage() {

  const nav = useNavigate();
  const [profile, setProfile] = useState<Voter | null>(null);
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    // Try to load cached session first for speed
    const s = getSession();
    if (s) {
      setProfile({
        username: s.nin,
        full_name: s.fullName,
        email: s.email || "",
        state: s.state,
        lga: s.lga,
        is_verified: s.verified,
        language: s.language,
        role: (s as any).role || 'voter',
        staff_number: (s as any).staff_number || ''
      });
    }

    const fetchData = () => {
      setLoading(true);

      apiRequest<Election[]>("/elections/")
        .then(setElections)
        .catch(console.error);

      apiRequest<Voter>("/auth/profile/")
        .then(freshProfile => {
          setProfile(freshProfile);
          
          const s = getSession();
          if (s) {
            (s as any).role = freshProfile.role;
            (s as any).staff_number = freshProfile.staff_number;
            (s as any).fullName = freshProfile.full_name;
            (s as any).state = freshProfile.state;
            (s as any).lga = freshProfile.lga;
            localStorage.setItem("rvng.session.v1", JSON.stringify(s));
          }
          setLoading(false);
        })
        .catch(err => {
          console.error("Dashboard data load failed:", err);
          setError("Session expired or server unavailable.");
          nav({ to: "/" });
        });
    };

    fetchData();
  }, [nav]);

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto max-w-6xl px-4 py-16 text-center animate-pulse">
          <p className="text-muted-foreground">Loading electoral interface...</p>
        </div>
      </div>
    );
  }

  // Determine which dashboard sub-view to render based on user role
  const role = profile?.role || 'voter';

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        
        {/* Unified Banner showing Role and Credentials */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-dark via-brand to-[oklch(0.45_0.15_150)] p-6 text-white shadow-md sm:p-8 mb-8">
          <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  INEC Official Portal
                </span>
                {profile?.staff_number && (
                  <span className="rounded-full bg-yellow-400/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-300">
                    ID: {profile.staff_number}
                  </span>
                )}
              </div>
              <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
                {profile?.full_name}
              </h1>
              <p className="mt-1 text-sm text-white/80">
                Role: <span className="font-semibold uppercase text-yellow-300">{role.replace('_', ' ')}</span> · 
                Location: {profile?.lga ? `${profile.lga}, ${profile.state} State` : "National Headquarters"}
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur-sm transition hover:bg-white/20 ring-1 ring-white/15"
              >
                {showProfile ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showProfile ? "Hide Profile" : "View Profile"}
              </button>
            </div>
          </div>

          {/* Expandable NIMC/Staff Credentials section */}
          {showProfile && profile && (
            <div className="mt-6 border-t border-white/10 pt-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
                <h2 className="text-xs font-bold uppercase tracking-wider text-brand-light mb-4">Official Registration Records</h2>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <ProfileItem icon={<User className="h-4 w-4 text-brand-light" />} label="Full Name" value={profile.full_name} />
                  <ProfileItem icon={<ShieldCheck className="h-4 w-4 text-brand-light" />} label="NIN (ID)" value={profile.username} />
                  <ProfileItem icon={<Mail className="h-4 w-4 text-brand-light" />} label="Email Address" value={profile.email} />
                  <ProfileItem icon={<MapPin className="h-4 w-4 text-brand-light" />} label="Location" value={`${profile.lga}, ${profile.state}`} />
                </div>
              </div>
            </div>
          )}
        </section>

        {error && (
          <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {/* DYNAMIC DASHBOARD SWITCHER */}
        {role === 'voter' && <VoterDashboard elections={elections} loading={loading} />}
        {role === 'commissioner' && <CommissionerDashboard />}
        {role === 'secretary' && <SecretaryDashboard />}
        {role === 'po' && <PresidingOfficerDashboard />}
        {role === 'co' && <CollationOfficerDashboard elections={elections} />}
        {role === 'ro' && <ReturningOfficerDashboard elections={elections} />}
        {role === 'agent' && <PollingAgentDashboard />}
        {role === 'observer' && <ObserverDashboard />}
        {role === 'media' && <MediaDashboard elections={elections} />}
        {role === 'auditor' && <AuditorDashboard />}
        
        {/* Support sub-roles fallback */}
        {!['voter', 'commissioner', 'secretary', 'po', 'co', 'ro', 'agent', 'observer', 'media', 'auditor'].includes(role) && (
          <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <Shield className="h-12 w-12 text-brand mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold">Access Granted</h2>
            <p className="text-muted-foreground mt-1 max-w-md mx-auto">
              Your credentials are valid for role: <span className="font-semibold text-brand">{role}</span>. Subordinate officer panels can be managed from local field devices.
            </p>
          </div>
        )}



      </main>
    </div>
  );
}

// --- SUB-DASHBOARD: INEC COMMISSIONER ---
const STATUS_COLOURS: Record<string, string> = {
  drafted:   'bg-slate-500/15 text-slate-400',
  upcoming:  'bg-amber-500/15 text-amber-400',
  active:    'bg-emerald-500/15 text-emerald-400',
  collation: 'bg-blue-500/15 text-blue-400',
  closed:    'bg-muted text-muted-foreground',
};

const ELECTION_TYPE_OPTS = [
  { value: 'presidential',   label: 'Presidential' },
  { value: 'gubernatorial',  label: 'Gubernatorial' },
  { value: 'senatorial',     label: 'Senatorial' },
  { value: 'house_reps',     label: 'House of Representatives' },
  { value: 'state_assembly', label: 'State House of Assembly' },
  { value: 'council',        label: 'Local Government / Council' },
];

const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
  'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
  'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara',
];

interface ApiElection {
  id: string;
  title: string;
  election_type: string;
  election_type_display: string;
  description: string;
  date: string;
  status: string;
  status_display: string;
  eligible_states: string[];
  created_by_name: string | null;
  created_at: string | null;
  candidates: any[];
  candidate_count: number;
  approval_count: number;
}

function CommissionerDashboard() {
  const [elections, setElections] = useState<ApiElection[]>([]);
  const [accreditations, setAccreditations] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [pollingUnits, setPollingUnits] = useState<any[]>([]);
  const [nimcRecords, setNimcRecords] = useState<any[]>([]);
  const [loadState, setLoadState] = useState({ el: true, acc: true, inv: true, pu: true, nimc: true });
  const [activeTab, setActiveTab] = useState<'elections' | 'accreditations' | 'invitations' | 'pollingUnits' | 'nimc'>('elections');
  
  const loading = activeTab === 'elections' ? loadState.el :
                  activeTab === 'accreditations' ? loadState.acc :
                  activeTab === 'invitations' ? loadState.inv :
                  activeTab === 'pollingUnits' ? loadState.pu :
                  activeTab === 'nimc' ? loadState.nimc : false;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Elections modal/forms state
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [resending, setResending] = useState<Record<number, boolean>>({});
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  // Create election form state
  const [form, setForm] = useState({ title: '', election_type: 'presidential', description: '', date: '', eligible_states: [] as string[] });
  const [creating, setCreating] = useState(false);
  const [formErr, setFormErr] = useState<Record<string, string>>({});

  // Candidate form state
  const [candForm, setCandForm] = useState({ name: '', party: '', party_abbr: '', color: '#1565c0', manifesto: '', running_mate: '' });
  const [addingCand, setAddingCand] = useState<Record<string, boolean>>({});
  const [candErr, setCandErr] = useState<Record<string, string>>({});

  // Staff onboarding form state
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'po', polling_unit_id: '' });
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteErr, setInviteErr] = useState<string | null>(null);

  // Accreditation review state
  const [reviewing, setReviewing] = useState<Record<string, boolean>>({});

  // Polling Unit modal/form state
  const [showPuModal, setShowPuModal] = useState(false);
  const [puForm, setPuForm] = useState({ id: '', name: '', ward: '', lga: '', state: 'Lagos', registered_voters_count: 1000 });
  const [editingPuId, setEditingPuId] = useState<string | null>(null);

  // NIMC record modal/form state
  const [showNimcModal, setShowNimcModal] = useState(false);
  const [nimcForm, setNimcForm] = useState({ nin: '', full_name: '', state: 'Lagos', lga: '', biometric_hash: 'mock_biometric_hash_xyz_123' });
  const [editingNimcId, setEditingNimcId] = useState<number | null>(null);

  const fetchData = () => {
    setLoadState({ el: true, acc: true, inv: true, pu: true, nimc: true });
    
    apiRequest<ApiElection[]>('/commissioner/elections/')
      .then(setElections)
      .catch(e => setMsg({ text: e?.message || 'Failed to load elections', type: 'err' }))
      .finally(() => setLoadState(p => ({ ...p, el: false })));

    apiRequest<any[]>('/onboarding/accreditation/')
      .then(setAccreditations)
      .catch(e => setMsg({ text: e?.message || 'Failed to load accreditations', type: 'err' }))
      .finally(() => setLoadState(p => ({ ...p, acc: false })));

    apiRequest<any[]>('/onboarding/invitations/')
      .then(setInvitations)
      .catch(e => setMsg({ text: e?.message || 'Failed to load invitations', type: 'err' }))
      .finally(() => setLoadState(p => ({ ...p, inv: false })));

    apiRequest<any[]>('/polling-units/')
      .then(setPollingUnits)
      .catch(e => setMsg({ text: e?.message || 'Failed to load polling units', type: 'err' }))
      .finally(() => setLoadState(p => ({ ...p, pu: false })));

    apiRequest<any[]>('/nimc-records/')
      .then(setNimcRecords)
      .catch(e => setMsg({ text: e?.message || 'Failed to load NIMC records', type: 'err' }))
      .finally(() => setLoadState(p => ({ ...p, nimc: false })));
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>, type: 'polling-units' | 'nimc' | 'invitations') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const parsedRows = parseCSV(text);
      if (parsedRows.length < 2) {
        alert("Invalid CSV file. Must include a header row and at least one data row.");
        return;
      }

      const headers = parsedRows[0];
      const dataRows = parsedRows.slice(1).filter(r => r.length > 0 && r.some(cell => cell.trim() !== ""));

      let items: any[] = [];
      let url = "";

      if (type === 'polling-units') {
        items = dataRows.map(row => mapRowToPu(row, headers));
        url = "/polling-units/";
      } else if (type === 'nimc') {
        items = dataRows.map(row => mapRowToNimc(row, headers));
        url = "/nimc-records/";
      } else if (type === 'invitations') {
        items = dataRows.map(row => mapRowToInvite(row, headers));
        url = "/onboarding/invite/";
      }

      try {
        const response = await apiRequest<any>(url, 'POST', items);
        setMsg({ text: response.message || `Successfully imported ${items.length} records!`, type: 'ok' });
        fetchData();
      } catch (err: any) {
        setMsg({ text: "Import failed: " + err.message, type: 'err' });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.date) errs.date = 'Date is required';
    if (Object.keys(errs).length) { setFormErr(errs); return; }

    setCreating(true);
    setFormErr({});
    try {
      await apiRequest('/commissioner/elections/create/', 'POST', form);
      setShowCreate(false);
      setForm({ title: '', election_type: 'presidential', description: '', date: '', eligible_states: [] });
      setMsg({ text: 'Election drafted successfully!', type: 'ok' });
      const el = await apiRequest<ApiElection[]>('/commissioner/elections/');
      setElections(el);
    } catch (e: any) {
      setMsg({ text: e?.message || 'Failed to create election', type: 'err' });
    } finally {
      setCreating(false);
    }
  };

  const handleAdvance = async (id: string) => {
    setAdvancing(p => ({ ...p, [id]: true }));
    setMsg(null);
    try {
      const res = await apiRequest<any>(`/commissioner/elections/${id}/advance/`, 'POST');
      setMsg({ text: res.message, type: 'ok' });
      const el = await apiRequest<ApiElection[]>('/commissioner/elections/');
      setElections(el);
    } catch (e: any) {
      setMsg({ text: e?.message || 'Status transition failed', type: 'err' });
    } finally {
      setAdvancing(p => ({ ...p, [id]: false }));
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete the DRAFT election "${title}"? This cannot be undone.`)) return;
    setDeleting(p => ({ ...p, [id]: true }));
    try {
      await apiRequest(`/commissioner/elections/${id}/`, 'DELETE');
      setMsg({ text: `Election "${title}" deleted.`, type: 'ok' });
      const el = await apiRequest<ApiElection[]>('/commissioner/elections/');
      setElections(el);
    } catch (e: any) {
      setMsg({ text: e?.message || 'Delete failed', type: 'err' });
    } finally {
      setDeleting(p => ({ ...p, [id]: false }));
    }
  };

  const handleAddCandidate = async (e: React.FormEvent, electionId: string) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!candForm.name.trim()) errs.name = 'Name required';
    if (!candForm.party.trim()) errs.party = 'Party required';
    if (!candForm.party_abbr.trim()) errs.party_abbr = 'Abbreviation required';
    if (!candForm.manifesto.trim()) errs.manifesto = 'Manifesto required';
    if (Object.keys(errs).length) { setCandErr(errs); return; }

    setAddingCand(p => ({ ...p, [electionId]: true }));
    setCandErr({});
    try {
      await apiRequest(`/commissioner/elections/${electionId}/candidates/`, 'POST', candForm);
      setCandForm({ name: '', party: '', party_abbr: '', color: '#1565c0', manifesto: '', running_mate: '' });
      setMsg({ text: 'Candidate registered successfully!', type: 'ok' });
      const el = await apiRequest<ApiElection[]>('/commissioner/elections/');
      setElections(el);
    } catch (e: any) {
      setMsg({ text: e?.message || 'Failed to add candidate', type: 'err' });
    } finally {
      setAddingCand(p => ({ ...p, [electionId]: false }));
    }
  };

  const handleRemoveCandidate = async (electionId: string, candidateId: string, name: string) => {
    if (!confirm(`Remove candidate "${name}" from this election?`)) return;
    try {
      await apiRequest(`/commissioner/elections/${electionId}/candidates/${candidateId}/`, 'DELETE');
      setMsg({ text: `Candidate "${name}" removed.`, type: 'ok' });
      const el = await apiRequest<ApiElection[]>('/commissioner/elections/');
      setElections(el);
    } catch (e: any) {
      setMsg({ text: e?.message || 'Failed to remove candidate', type: 'err' });
    }
  };

  const handleReviewAccreditation = async (id: number, decision: 'approve' | 'reject') => {
    let notes = 'Approved';
    if (decision === 'reject') {
      const promptNotes = prompt('Please enter rejection notes / reasons:');
      if (promptNotes === null) return; // cancelled
      notes = promptNotes || 'Does not meet organization criteria';
    }

    setReviewing(p => ({ ...p, [id]: true }));
    setMsg(null);
    try {
      const res = await apiRequest(`/onboarding/accreditation/${id}/review/`, 'POST', { decision, notes });
      setMsg({ text: res.message, type: 'ok' });
      const [acc, invs] = await Promise.all([
        apiRequest<any[]>('/onboarding/accreditation/'),
        apiRequest<any[]>('/onboarding/invitations/')
      ]);
      setAccreditations(acc);
      setInvitations(invs);
    } catch (e: any) {
      setMsg({ text: e?.message || 'Accreditation review failed', type: 'err' });
    } finally {
      setReviewing(p => ({ ...p, [id]: false }));
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteErr(null);
    if (!inviteForm.email) {
      setInviteErr('Email is required.');
      return;
    }
    setSendingInvite(true);
    try {
      const res = await apiRequest('/onboarding/invite/', 'POST', inviteForm);
      setMsg({ text: res.message, type: 'ok' });
      setInviteForm({ email: '', role: 'po', polling_unit_id: '' });
      const invs = await apiRequest<any[]>('/onboarding/invitations/');
      setInvitations(invs);
    } catch (e: any) {
      setInviteErr(e?.message || 'Invitation submission failed');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleResendInvite = async (id: number, email: string) => {
    setMsg(null);
    setResending(prev => ({ ...prev, [id]: true }));
    try {
      const res = await apiRequest(`/onboarding/invite/${id}/resend/`, 'POST');
      setMsg({ text: res.message, type: 'ok' });
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to resend invitation email', type: 'err' });
    } finally {
      setResending(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleSavePu = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((editingPuId && !puForm.id) || !puForm.name || !puForm.ward || !puForm.lga || !puForm.state) {
      alert('Required fields (Name, Ward, LGA, State) are missing.');
      return;
    }
    try {
      if (editingPuId) {
        await apiRequest(`/polling-units/${editingPuId}/`, 'PATCH', puForm);
        setMsg({ text: `Polling Unit ${editingPuId} updated.`, type: 'ok' });
      } else {
        const newPu = await apiRequest<any>('/polling-units/', 'POST', puForm);
        setMsg({ text: `Polling Unit ${newPu?.id || 'successfully'} registered.`, type: 'ok' });
      }
      setShowPuModal(false);
      setEditingPuId(null);
      setPuForm({ id: '', name: '', ward: '', lga: '', state: 'Lagos', registered_voters_count: 1000 });
      const data = await apiRequest<any[]>('/polling-units/');
      setPollingUnits(data);
    } catch (err: any) {
      alert(err.message || 'Failed to save Polling Unit');
    }
  };

  const handleDeletePu = async (id: string) => {
    if (!confirm(`Delete Polling Unit ${id}?`)) return;
    try {
      await apiRequest(`/polling-units/${id}/`, 'DELETE');
      setMsg({ text: `Polling Unit ${id} deleted.`, type: 'ok' });
      const data = await apiRequest<any[]>('/polling-units/');
      setPollingUnits(data);
    } catch (err: any) {
      alert(err.message || 'Failed to delete Polling Unit');
    }
  };

  const handleSaveNimc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nimcForm.nin || !nimcForm.full_name || !nimcForm.state || !nimcForm.lga) {
      alert('All fields are required to register a NIMC citizen.');
      return;
    }
    try {
      if (editingNimcId) {
        await apiRequest(`/nimc-records/${editingNimcId}/`, 'PATCH', nimcForm);
        setMsg({ text: 'NIMC record updated.', type: 'ok' });
      } else {
        await apiRequest('/nimc-records/', 'POST', nimcForm);
        setMsg({ text: 'New citizen registered in NIMC database.', type: 'ok' });
      }
      setShowNimcModal(false);
      setEditingNimcId(null);
      setNimcForm({ nin: '', full_name: '', state: 'Lagos', lga: '', biometric_hash: 'mock_biometric_hash_xyz_123' });
      const data = await apiRequest<any[]>('/nimc-records/');
      setNimcRecords(data);
    } catch (err: any) {
      alert(err.message || 'Failed to save NIMC record');
    }
  };

  const handleDeleteNimc = async (id: number) => {
    if (!confirm('Remove this citizen record from the National ID database?')) return;
    try {
      await apiRequest(`/nimc-records/${id}/`, 'DELETE');
      setMsg({ text: 'NIMC citizen record deleted.', type: 'ok' });
      const data = await apiRequest<any[]>('/nimc-records/');
      setNimcRecords(data);
    } catch (err: any) {
      alert(err.message || 'Failed to delete NIMC record');
    }
  };

  const NEXT_ACTION: Record<string, string> = {
    drafted:   'Publish (→ Upcoming)',
    upcoming:  'Open Polls (→ Active)',
    active:    'Close Polls (→ Collation)',
  };

  const isRolePuBound = ['po', 'apo', 'spo', 'agent'].includes(inviteForm.role);

  // Filtered datasets
  const filteredElections = elections.filter(el => {
    const matchesSearch = el.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || el.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredAccreditations = accreditations.filter(acc => {
    const matchesSearch = acc.organization_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          acc.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          acc.contact_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || acc.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredInvitations = invitations.filter(inv => {
    const matchesSearch = inv.invited_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inv.staff_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || 
                          inv.role === statusFilter || 
                          (statusFilter === 'used' && inv.is_used) ||
                          (statusFilter === 'pending' && !inv.is_used);
    return matchesSearch && matchesFilter;
  });

  const filteredPollingUnits = pollingUnits.filter(pu => {
    const matchesSearch = pu.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          pu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          pu.ward.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          pu.lga.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || pu.state === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredNimcRecords = nimcRecords.filter(nm => {
    const matchesSearch = nm.nin.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          nm.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          nm.lga.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || nm.state === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Control Center Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="font-display text-2xl font-bold">INEC Electoral Commissioner Terminal</h2>
          <p className="text-xs text-muted-foreground mt-0.5">National headquarters gateway for election control, official provisioning, and observer accreditation.</p>
        </div>
        {activeTab === 'elections' && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-dark transition self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Draft New Election
          </button>
        )}
        {activeTab === 'pollingUnits' && (
          <button
            onClick={() => {
              setEditingPuId(null);
              setPuForm({ id: '', name: '', ward: '', lga: '', state: 'Lagos', registered_voters_count: 1000 });
              setShowPuModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-dark transition self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Register Polling Unit
          </button>
        )}
        {activeTab === 'nimc' && (
          <button
            onClick={() => {
              setEditingNimcId(null);
              setNimcForm({ nin: '', full_name: '', state: 'Lagos', lga: '', biometric_hash: 'mock_biometric_hash_xyz_123' });
              setShowNimcModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-dark transition self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Register NIMC Citizen
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-2 flex-wrap">
        <button
          onClick={() => { setActiveTab('elections'); setMsg(null); setSearchQuery(""); setStatusFilter("all"); }}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition uppercase tracking-wider ${activeTab === 'elections' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          🗳️ Elections ({elections.length})
        </button>
        <button
          onClick={() => { setActiveTab('accreditations'); setMsg(null); setSearchQuery(""); setStatusFilter("all"); }}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition uppercase tracking-wider ${activeTab === 'accreditations' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          📰 Accreditations ({accreditations.filter(a => a.status === 'pending').length} pending)
        </button>
        <button
          onClick={() => { setActiveTab('invitations'); setMsg(null); setSearchQuery(""); setStatusFilter("all"); }}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition uppercase tracking-wider ${activeTab === 'invitations' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          ✉️ Staff Onboarding
        </button>
        <button
          onClick={() => { setActiveTab('pollingUnits'); setMsg(null); setSearchQuery(""); setStatusFilter("all"); }}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition uppercase tracking-wider ${activeTab === 'pollingUnits' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          📍 Polling Units ({pollingUnits.length})
        </button>
        <button
          onClick={() => { setActiveTab('nimc'); setMsg(null); setSearchQuery(""); setStatusFilter("all"); }}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition uppercase tracking-wider ${activeTab === 'nimc' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          🪪 NIMC Registry ({nimcRecords.length})
        </button>
      </div>

      {/* Flash message */}
      {msg && (
        <div className={`rounded-xl p-3 text-xs font-semibold ${msg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'} animate-in fade-in`}>
          {msg.type === 'ok' ? '✅' : '⚠️'} {msg.text}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Search ${
              activeTab === 'elections' ? 'elections by title...' :
              activeTab === 'accreditations' ? 'accreditations by name/org/email...' :
              activeTab === 'invitations' ? 'invitations by email/staff ID...' :
              activeTab === 'pollingUnits' ? 'polling units by code/name/ward/LGA...' :
              activeTab === 'nimc' ? 'NIMC citizens by NIN/name/LGA...' :
              'records...'
            }`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs outline-none focus:border-brand"
          />
        </div>

        <div className="flex gap-2">
          {activeTab === 'elections' && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand"
            >
              <option value="all">All Statuses</option>
              <option value="drafted">Drafted</option>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="collation">Collation</option>
              <option value="closed">Closed</option>
            </select>
          )}

          {activeTab === 'accreditations' && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          )}

          {activeTab === 'invitations' && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand"
            >
              <option value="all">All Roles & Status</option>
              <option value="pending">Pending Invitation</option>
              <option value="used">Activated Account</option>
              <option value="commissioner">INEC Commissioner</option>
              <option value="secretary">INEC Secretary</option>
              <option value="ro">Returning Officer</option>
              <option value="co">Collation Officer</option>
              <option value="po">Presiding Officer</option>
              <option value="apo">Assistant Presiding Officer</option>
              <option value="spo">Supervisory Presiding Officer</option>
              <option value="auditor">Auditor</option>
            </select>
          )}

          {(activeTab === 'pollingUnits' || activeTab === 'nimc') && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand"
            >
              <option value="all">All States</option>
              {NIGERIAN_STATES.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: ELECTIONS */}
      {activeTab === 'elections' && (
        <div className="space-y-6">
          {/* Create Election Modal */}
          {showCreate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-lg font-bold">Draft New Election</h3>
                  <button onClick={() => setShowCreate(false)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">✕</button>
                </div>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Election Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. 2027 Presidential Election"
                      value={form.title}
                      onChange={e => { setForm(p => ({ ...p, title: e.target.value })); setFormErr(p => ({ ...p, title: '' })); }}
                      className={`w-full mt-1 rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand ${formErr.title ? 'border-destructive' : 'border-input'}`}
                    />
                    {formErr.title && <p className="text-xs text-destructive mt-1">{formErr.title}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-muted-foreground">Election Type *</label>
                      <select
                        value={form.election_type}
                        onChange={e => setForm(p => ({ ...p, election_type: e.target.value }))}
                        className="w-full mt-1 rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-brand"
                      >
                        {ELECTION_TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-muted-foreground">Election Date *</label>
                      <input
                        type="date"
                        value={form.date}
                        onChange={e => { setForm(p => ({ ...p, date: e.target.value })); setFormErr(p => ({ ...p, date: '' })); }}
                        className={`w-full mt-1 rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand ${formErr.date ? 'border-destructive' : 'border-input'}`}
                      />
                      {formErr.date && <p className="text-xs text-destructive mt-1">{formErr.date}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Official Description</label>
                    <textarea
                      rows={3}
                      placeholder="Official INEC election brief (optional)"
                      value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-brand resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Eligible States (leave blank = nationwide)</label>
                    <div className="mt-1.5 max-h-36 overflow-y-auto rounded-lg border border-input bg-background p-2 grid grid-cols-2 gap-1">
                      {NIGERIAN_STATES.map(st => (
                        <label key={st} className="flex items-center gap-1.5 text-xs cursor-pointer hover:text-foreground text-muted-foreground py-0.5">
                          <input
                            type="checkbox"
                            checked={form.eligible_states.includes(st)}
                            onChange={e => setForm(p => ({
                              ...p,
                              eligible_states: e.target.checked
                                ? [...p.eligible_states, st]
                                : p.eligible_states.filter(s => s !== st)
                            }))}
                            className="h-3 w-3 accent-brand"
                          />
                          {st}
                        </label>
                      ))}
                    </div>
                    {form.eligible_states.length > 0 && (
                      <p className="text-[10px] text-brand mt-1">{form.eligible_states.length} state(s) selected</p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-input py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted">
                      Cancel
                    </button>
                    <button type="submit" disabled={creating} className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
                      {creating ? 'Creating…' : '📋 Save as Draft'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Elections Table */}
          <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-brand" />
                <h3 className="font-display text-base font-bold">All Elections</h3>
              </div>
              <button onClick={fetchData} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                <RotateCw className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <p className="py-12 text-center text-sm text-muted-foreground animate-pulse">Loading elections…</p>
            ) : filteredElections.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl m-4">
                No matching elections found.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredElections.map(el => {
                  const isExpanded = expandedId === el.id;
                  const canAdvance = ['drafted', 'upcoming', 'active'].includes(el.status);
                  const canDelete = el.status === 'drafted';

                  return (
                    <div key={el.id}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 hover:bg-muted/20 transition">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${STATUS_COLOURS[el.status] || 'bg-muted text-muted-foreground'}`}>
                              {el.status_display}
                            </span>
                            <span className="text-[9px] text-muted-foreground border border-border rounded-full px-2 py-0.5">
                              {el.election_type_display}
                            </span>
                          </div>
                          <h4 className="font-display font-bold text-foreground">{el.title}</h4>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {el.date} · ID: {el.id} · {el.candidate_count} candidate(s)
                            {el.created_by_name && ` · By ${el.created_by_name}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : el.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
                          >
                            <Users className="h-3.5 w-3.5" />
                            {isExpanded ? 'Hide' : 'Candidates'}
                          </button>

                          {canAdvance && (
                            <button
                              onClick={() => handleAdvance(el.id)}
                              disabled={advancing[el.id]}
                              className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                              {advancing[el.id] ? 'Working…' : NEXT_ACTION[el.status]}
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => handleDelete(el.id, el.title)}
                              disabled={deleting[el.id]}
                              className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50"
                            >
                              {deleting[el.id] ? '…' : '🗑'}
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-border bg-muted/20 p-4 space-y-4">
                          {el.candidates.length > 0 ? (
                            <div>
                              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Registered Candidates</p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {el.candidates.map(c => (
                                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <div className="h-6 w-6 rounded-full flex-shrink-0" style={{ background: c.color }} />
                                      <div>
                                        <p className="text-xs font-semibold text-foreground">{c.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{c.party_abbr} · {c.party}</p>
                                      </div>
                                    </div>
                                    {!['active', 'collation', 'closed'].includes(el.status) && (
                                      <button
                                        onClick={() => handleRemoveCandidate(el.id, c.id, c.name)}
                                        className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                      >✕</button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No candidates yet.</p>
                          )}

                          {!['active', 'collation', 'closed'].includes(el.status) && (
                            <div>
                              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Register New Candidate</p>
                              <form onSubmit={e => handleAddCandidate(e, el.id)} className="grid gap-2 sm:grid-cols-2">
                                <div>
                                  <input
                                    type="text" placeholder="Candidate full name *"
                                    value={candForm.name}
                                    onChange={e => { setCandForm(p => ({ ...p, name: e.target.value })); setCandErr(p => ({ ...p, name: '' })); }}
                                    className={`w-full rounded-lg border bg-background px-2.5 py-2 text-xs outline-none focus:border-brand ${candErr.name ? 'border-destructive' : 'border-input'}`}
                                  />
                                  {candErr.name && <p className="text-[10px] text-destructive">{candErr.name}</p>}
                                </div>
                                <div>
                                  <input
                                    type="text" placeholder="Political party full name *"
                                    value={candForm.party}
                                    onChange={e => { setCandForm(p => ({ ...p, party: e.target.value })); setCandErr(p => ({ ...p, party: '' })); }}
                                    className={`w-full rounded-lg border bg-background px-2.5 py-2 text-xs outline-none focus:border-brand ${candErr.party ? 'border-destructive' : 'border-input'}`}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="text" placeholder="Abbr. e.g. APC *" maxLength={10}
                                    value={candForm.party_abbr}
                                    onChange={e => { setCandForm(p => ({ ...p, party_abbr: e.target.value })); setCandErr(p => ({ ...p, party_abbr: '' })); }}
                                    className={`flex-1 rounded-lg border bg-background px-2.5 py-2 text-xs outline-none focus:border-brand ${candErr.party_abbr ? 'border-destructive' : 'border-input'}`}
                                  />
                                  <div className="flex items-center gap-1.5">
                                    <label className="text-[10px] text-muted-foreground whitespace-nowrap">Party colour:</label>
                                    <input
                                      type="color" value={candForm.color}
                                      onChange={e => setCandForm(p => ({ ...p, color: e.target.value }))}
                                      className="h-8 w-10 rounded cursor-pointer border border-input bg-background"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <input
                                    type="text" placeholder="Running mate name (optional)"
                                    value={candForm.running_mate}
                                    onChange={e => setCandForm(p => ({ ...p, running_mate: e.target.value }))}
                                    className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus:border-brand"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <textarea
                                    placeholder="Manifesto / campaign summary *"
                                    rows={2}
                                    value={candForm.manifesto}
                                    onChange={e => { setCandForm(p => ({ ...p, manifesto: e.target.value })); setCandErr(p => ({ ...p, manifesto: '' })); }}
                                    className={`w-full rounded-lg border bg-background px-2.5 py-2 text-xs outline-none focus:border-brand resize-none ${candErr.manifesto ? 'border-destructive' : 'border-input'}`}
                                  />
                                  {candErr.manifesto && <p className="text-[10px] text-destructive">{candErr.manifesto}</p>}
                                </div>
                                <div className="sm:col-span-2">
                                  <button
                                    type="submit"
                                    disabled={addingCand[el.id]}
                                    className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                                  >
                                    {addingCand[el.id] ? 'Registering…' : '+ Register Candidate'}
                                  </button>
                                </div>
                              </form>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Status lifecycle guide */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="font-display text-sm font-bold mb-3 text-muted-foreground uppercase tracking-wider">Election Lifecycle</h3>
            <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
              {[
                { s: 'drafted', label: 'Drafted' },
                { s: 'upcoming', label: 'Upcoming' },
                { s: 'active', label: 'Active' },
                { s: 'collation', label: 'Collation' },
                { s: 'closed', label: 'Closed' },
              ].map((item, i, arr) => (
                <span key={item.s} className="flex items-center gap-1.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${STATUS_COLOURS[item.s]}`}>{item.label}</span>
                  {i < arr.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Commissioners advance elections through <strong>Drafted → Collation</strong>. 
              The final <strong>Collation → Closed</strong> step requires multi-signature approval from Returning Officers.
            </p>
          </section>
        </div>
      )}

      {/* TAB 2: ACCREDITATIONS */}
      {activeTab === 'accreditations' && (
        <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden p-6">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
            <h3 className="font-display text-lg font-bold">Accreditation Requests</h3>
            <button onClick={fetchData} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
              <RotateCw className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground mb-6">
            Review submitted media licences and observer credentials. Approving an application will generate a secure onboarding link and trigger automated notification emails.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[10px]">
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Reference ID</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground animate-pulse">Loading applications...</td></tr>
                ) : filteredAccreditations.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No matching accreditation applications found.</td></tr>
                ) : (
                  filteredAccreditations.map(acc => (
                    <tr key={acc.id} className="hover:bg-muted/30 align-top">
                      <td className="py-3 px-4 font-bold text-foreground">{acc.organization_name}</td>
                      <td className="py-3 px-4 capitalize">{acc.applicant_type.replace('_', ' ')}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold">{acc.contact_name}</span> <br/>
                        <span className="text-[10px] text-muted-foreground">{acc.contact_email}</span>
                      </td>
                      <td className="py-3 px-4 font-mono">{acc.organization_id}</td>
                      <td className="py-3 px-4 max-w-xs truncate">{acc.mandate_description}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase ${
                          acc.status === 'approved' ? 'bg-success/15 text-success' :
                          acc.status === 'rejected' ? 'bg-destructive/15 text-destructive' :
                          'bg-amber-500/15 text-amber-500'
                        }`}>
                          {acc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {acc.status === 'pending' ? (
                          <>
                            <button
                              disabled={reviewing[acc.id]}
                              onClick={() => handleReviewAccreditation(acc.id, 'approve')}
                              className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              disabled={reviewing[acc.id]}
                              onClick={() => handleReviewAccreditation(acc.id, 'reject')}
                              className="rounded bg-destructive px-2 py-1 text-[10px] font-bold text-white hover:bg-destructive-dark disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: STAFF INVITATIONS */}
      {activeTab === 'invitations' && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Create Invite Form */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm self-start">
            <h3 className="font-display text-base font-bold border-b border-border pb-3 mb-4">Onboard Official</h3>
            
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase text-muted-foreground">Official Email *</label>
                <input
                  type="email"
                  placeholder="name@email.com"
                  value={inviteForm.email}
                  onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase text-muted-foreground">Staff ID (Autogenerated)</label>
                <input
                  type="text"
                  readOnly
                  placeholder="STAFF-[ROLE]-[RANDOM_ID]"
                  className="w-full mt-1 rounded-lg border border-input bg-muted px-3 py-2 text-xs outline-none cursor-not-allowed font-mono text-muted-foreground"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase text-muted-foreground">Electoral Role *</label>
                <select
                  value={inviteForm.role}
                  onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full mt-1 rounded-lg border border-input bg-card px-3 py-2 text-xs outline-none focus:border-brand"
                >
                  <option value="commissioner">INEC Commissioner (HQ)</option>
                  <option value="ro">Returning Officer (RO)</option>
                  <option value="co">Collation Officer (CO)</option>
                  <option value="po">Presiding Officer (PO)</option>
                  <option value="apo">Assistant Presiding Officer (APO)</option>
                  <option value="spo">Supervisory Presiding Officer (SPO)</option>
                  <option value="auditor">Cybersecurity Auditor</option>
                </select>
              </div>

              {isRolePuBound && (
                <div>
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">Assigned Polling Unit</label>
                  <select
                    value={inviteForm.polling_unit_id}
                    onChange={e => setInviteForm(p => ({ ...p, polling_unit_id: e.target.value }))}
                    className="w-full mt-1 rounded-lg border border-input bg-card px-3 py-2 text-xs outline-none focus:border-brand"
                  >
                    <option value="">Select Polling Unit...</option>
                    {pollingUnits.map(pu => (
                      <option key={pu.id} value={pu.id}>{pu.name} ({pu.id})</option>
                    ))}
                  </select>
                </div>
              )}

              {inviteErr && (
                <p className="rounded-md bg-destructive/10 p-2.5 text-[10px] text-destructive leading-relaxed font-semibold">
                  {inviteErr}
                </p>
              )}

              <button
                type="submit"
                disabled={sendingInvite}
                className="w-full rounded-lg bg-brand py-2 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {sendingInvite ? 'Generating invite…' : '📨 Generate Invitation'}
              </button>
            </form>
          </section>

          {/* Invitation Log */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 mb-4">
              <h3 className="font-display text-base font-bold">Onboarding Invitations Logs</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportToCSV(filteredInvitations, ['staff_number', 'invited_email', 'role', 'is_used', 'expires_at'], ['Staff Number', 'Email Address', 'Role', 'Is Activated', 'Expires At'], 'staff_invitations.csv')}
                  className="inline-flex items-center gap-1 rounded-lg border border-input bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted transition"
                >
                  📥 Export CSV
                </button>
                <label className="inline-flex items-center gap-1 rounded-lg border border-input bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted transition cursor-pointer">
                  📤 Bulk Invite (CSV)
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => handleImportCSV(e, 'invitations')} />
                </label>
                <button onClick={fetchData} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                  <RotateCw className="h-4 w-4" />
                </button>
              </div>
            </div>


            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase text-[10px]">
                    <th className="py-2.5 px-3">Staff Number</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan={5} className="py-8 text-center text-muted-foreground animate-pulse">Loading invitations...</td></tr>
                  ) : filteredInvitations.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No matching invitations found.</td></tr>
                  ) : (
                    filteredInvitations.map(inv => {
                      const isExpired = new Date(inv.expires_at) < new Date();
                      const statusLabel = inv.is_used ? 'Activated' : isExpired ? 'Expired' : 'Pending';
                      const link = `${window.location.origin}/onboard?token=${inv.token}`;
                      return (
                        <tr key={inv.id} className="hover:bg-muted/20 align-middle">
                          <td className="py-2.5 px-3 font-mono font-bold text-foreground">{inv.staff_number}</td>
                          <td className="py-2.5 px-3">{inv.invited_email}</td>
                          <td className="py-2.5 px-3 uppercase text-[10px]">{inv.role}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block rounded px-2 py-0.5 text-[8px] font-bold uppercase ${
                              statusLabel === 'Activated' ? 'bg-success/10 text-success' :
                              statusLabel === 'Expired' ? 'bg-destructive/10 text-destructive' :
                              'bg-amber-500/10 text-amber-500'
                            }`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1">
                            {statusLabel === 'Pending' ? (
                              <>
                                <button
                                  disabled={resending[inv.id]}
                                  onClick={() => handleResendInvite(inv.id, inv.invited_email)}
                                  className="inline-block bg-primary-soft text-brand-dark rounded px-2 py-1 text-[9px] hover:bg-brand/10 transition font-semibold disabled:opacity-50"
                                >
                                  {resending[inv.id] ? '⏳ Resending…' : '✉️ Send Mail'}
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(link);
                                    alert('Activation URL copied to clipboard!');
                                  }}
                                  className="inline-block border border-input rounded px-2 py-1 text-[9px] hover:bg-muted transition"
                                >
                                  Copy Link
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-muted-foreground font-mono">Inactive</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: POLLING UNITS CRUD */}
      {activeTab === 'pollingUnits' && (
        <section className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4 mb-6">
            <h3 className="font-display text-lg font-bold">INEC Registered Polling Units</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportToCSV(filteredPollingUnits, ['id', 'name', 'ward', 'lga', 'state', 'registered_voters_count'], ['Code / ID', 'Name', 'Ward', 'LGA', 'State', 'Registered Voters'], 'polling_units.csv')}
                className="inline-flex items-center gap-1 rounded-lg border border-input bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted transition"
              >
                📥 Export CSV
              </button>
              <label className="inline-flex items-center gap-1 rounded-lg border border-input bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted transition cursor-pointer">
                📤 Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={(e) => handleImportCSV(e, 'polling-units')} />
              </label>
              <button onClick={fetchData} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                <RotateCw className="h-4 w-4" />
              </button>
            </div>
          </div>


          {showPuModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6">
                <h3 className="font-display text-lg font-bold mb-4">{editingPuId ? 'Update Polling Unit' : 'Register New Polling Unit'}</h3>
                <form onSubmit={handleSavePu} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">
                      Polling Unit Code/ID {editingPuId ? '*' : '(Autogenerated)'}
                    </label>
                    <input
                      type="text"
                      placeholder={editingPuId ? "e.g. PU-24-05-11" : "PU-[RANDOM_ID] (Autogenerated)"}
                      disabled={true}
                      value={puForm.id}
                      onChange={e => setPuForm(p => ({ ...p, id: e.target.value.toUpperCase() }))}
                      className="w-full mt-1 rounded-lg border border-input bg-muted px-3 py-2 text-xs outline-none cursor-not-allowed font-mono text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Facility Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Alausa Primary School"
                      value={puForm.name}
                      onChange={e => setPuForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-muted-foreground">Ward *</label>
                      <input
                        type="text"
                        placeholder="Alausa"
                        value={puForm.ward}
                        onChange={e => setPuForm(p => ({ ...p, ward: e.target.value }))}
                        className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-muted-foreground">LGA *</label>
                      <input
                        type="text"
                        placeholder="Ikeja"
                        value={puForm.lga}
                        onChange={e => setPuForm(p => ({ ...p, lga: e.target.value }))}
                        className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-muted-foreground">State *</label>
                      <select
                        value={puForm.state}
                        onChange={e => setPuForm(p => ({ ...p, state: e.target.value }))}
                        className="w-full mt-1 rounded-lg border border-input bg-card px-3 py-2 text-xs outline-none focus:border-brand"
                      >
                        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-muted-foreground">Registered Voters Count</label>
                      <input
                        type="number"
                        value={puForm.registered_voters_count}
                        onChange={e => setPuForm(p => ({ ...p, registered_voters_count: Number(e.target.value) }))}
                        className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowPuModal(false)} className="flex-1 rounded-xl border border-input py-2 text-xs font-semibold hover:bg-muted">
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 rounded-xl bg-brand py-2 text-xs font-semibold text-white hover:bg-brand-dark">
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[10px]">
                  <th className="py-3 px-4">Code / ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Ward / LGA</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4">Registered Voters</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPollingUnits.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No matching polling units found.</td></tr>
                ) : (
                  filteredPollingUnits.map(pu => (
                  <tr key={pu.id} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">{pu.id}</td>
                    <td className="py-3 px-4">{pu.name}</td>
                    <td className="py-3 px-4">{pu.ward} Ward, {pu.lga}</td>
                    <td className="py-3 px-4">{pu.state}</td>
                    <td className="py-3 px-4 font-mono">{pu.registered_voters_count.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setEditingPuId(pu.id);
                          setPuForm({ id: pu.id, name: pu.name, ward: pu.ward, lga: pu.lga, state: pu.state, registered_voters_count: pu.registered_voters_count });
                          setShowPuModal(true);
                        }}
                        className="rounded border border-input px-2 py-1 text-[10px] hover:bg-muted font-semibold text-muted-foreground"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePu(pu.id)}
                        className="rounded bg-destructive/10 text-destructive px-2 py-1 text-[10px] hover:bg-destructive/20 font-semibold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 5: NIMC REGISTRY CRUD */}
      {activeTab === 'nimc' && (
        <section className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4 mb-6">
            <h3 className="font-display text-lg font-bold">National NIMC Identity Database</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportToCSV(filteredNimcRecords, ['nin', 'full_name', 'state', 'lga', 'biometric_hash'], ['NIN', 'Full Name', 'State', 'LGA', 'Biometric Hash'], 'nimc_records.csv')}
                className="inline-flex items-center gap-1 rounded-lg border border-input bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted transition"
              >
                📥 Export CSV
              </button>
              <label className="inline-flex items-center gap-1 rounded-lg border border-input bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted transition cursor-pointer">
                📤 Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={(e) => handleImportCSV(e, 'nimc')} />
              </label>
              <button onClick={fetchData} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                <RotateCw className="h-4 w-4" />
              </button>
            </div>
          </div>


          <p className="text-xs text-muted-foreground mb-6">
            This panel interfaces directly with the simulated National Identity Management Commission (NIMC) register. Add or edit national registry profiles to mock physical biometric records.
          </p>

          {showNimcModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6">
                <h3 className="font-display text-lg font-bold mb-4">{editingNimcId ? 'Update Citizen Record' : 'Register Citizen in Database'}</h3>
                <form onSubmit={handleSaveNimc} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">National Identification Number (NIN) *</label>
                    <input
                      type="text"
                      placeholder="e.g. 11111111111"
                      maxLength={11}
                      disabled={!!editingNimcId}
                      value={nimcForm.nin}
                      onChange={e => setNimcForm(p => ({ ...p, nin: e.target.value.replace(/\D/g, '') }))}
                      className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand font-mono disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Full Registered Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Chinonso Alabi"
                      value={nimcForm.full_name}
                      onChange={e => setNimcForm(p => ({ ...p, full_name: e.target.value }))}
                      className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-muted-foreground">State of Origin/Res *</label>
                      <select
                        value={nimcForm.state}
                        onChange={e => setNimcForm(p => ({ ...p, state: e.target.value }))}
                        className="w-full mt-1 rounded-lg border border-input bg-card px-3 py-2 text-xs outline-none focus:border-brand"
                      >
                        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-muted-foreground">LGA of Registration *</label>
                      <input
                        type="text"
                        placeholder="e.g. Ikeja"
                        value={nimcForm.lga}
                        onChange={e => setNimcForm(p => ({ ...p, lga: e.target.value }))}
                        className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Biometric Hash Record</label>
                    <input
                      type="text"
                      value={nimcForm.biometric_hash}
                      onChange={e => setNimcForm(p => ({ ...p, biometric_hash: e.target.value }))}
                      className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand font-mono"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowNimcModal(false)} className="flex-1 rounded-xl border border-input py-2 text-xs font-semibold hover:bg-muted">
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 rounded-xl bg-brand py-2 text-xs font-semibold text-white hover:bg-brand-dark">
                      Save Record
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[10px]">
                  <th className="py-3 px-4">NIN</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Origin (State / LGA)</th>
                  <th className="py-3 px-4">Biometric Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredNimcRecords.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No matching citizen records found.</td></tr>
                ) : (
                  filteredNimcRecords.map(nm => (
                  <tr key={nm.id} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">{nm.nin}</td>
                    <td className="py-3 px-4">{nm.full_name}</td>
                    <td className="py-3 px-4">{nm.lga}, {nm.state} State</td>
                    <td className="py-3 px-4 font-mono text-[10px] text-muted-foreground truncate max-w-xs">{nm.biometric_hash}</td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setEditingNimcId(nm.id);
                          setNimcForm({ nin: nm.nin, full_name: nm.full_name, state: nm.state, lga: nm.lga, biometric_hash: nm.biometric_hash });
                          setShowNimcModal(true);
                        }}
                        className="rounded border border-input px-2 py-1 text-[10px] hover:bg-muted font-semibold text-muted-foreground"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteNimc(nm.id)}
                        className="rounded bg-destructive/10 text-destructive px-2 py-1 text-[10px] hover:bg-destructive/20 font-semibold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}


// --- SUB-DASHBOARD: INEC SECRETARY ---
function SecretaryDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [elections, setElections] = useState<ApiElection[]>([]);
  const [accreditations, setAccreditations] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [pollingUnits, setPollingUnits] = useState<any[]>([]);
  const [nimcRecords, setNimcRecords] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadState, setLoadState] = useState({ 
    metrics: true, el: true, acc: true, inv: true, pu: true, nimc: true, logs: true 
  });
  const [activeTab, setActiveTab] = useState<'metrics' | 'invitations' | 'accreditations' | 'elections' | 'pollingUnits' | 'nimc' | 'logs'>('metrics');

  const loading = activeTab === 'metrics' ? loadState.metrics :
                  activeTab === 'elections' ? loadState.el :
                  activeTab === 'accreditations' ? loadState.acc :
                  activeTab === 'invitations' ? loadState.inv :
                  activeTab === 'pollingUnits' ? loadState.pu :
                  activeTab === 'nimc' ? loadState.nimc :
                  activeTab === 'logs' ? loadState.logs : false;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Staff onboarding form state
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'po', polling_unit_id: '' });
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [resending, setResending] = useState<Record<number, boolean>>({});
  const [reviewing, setReviewing] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  // System audit expanded log state
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  const fetchData = () => {
    setLoadState({ metrics: true, el: true, acc: true, inv: true, pu: true, nimc: true, logs: true });

    apiRequest<any>('/secretary/metrics/')
      .then(setMetrics)
      .catch(e => setMsg({ text: e?.message || 'Failed to load metrics', type: 'err' }))
      .finally(() => setLoadState(p => ({ ...p, metrics: false })));

    apiRequest<ApiElection[]>('/commissioner/elections/')
      .then(setElections)
      .catch(e => setMsg({ text: e?.message || 'Failed to load elections', type: 'err' }))
      .finally(() => setLoadState(p => ({ ...p, el: false })));

    apiRequest<any[]>('/onboarding/accreditation/')
      .then(setAccreditations)
      .catch(e => setMsg({ text: e?.message || 'Failed to load accreditations', type: 'err' }))
      .finally(() => setLoadState(p => ({ ...p, acc: false })));

    apiRequest<any[]>('/onboarding/invitations/')
      .then(setInvitations)
      .catch(e => setMsg({ text: e?.message || 'Failed to load invitations', type: 'err' }))
      .finally(() => setLoadState(p => ({ ...p, inv: false })));

    apiRequest<any[]>('/polling-units/')
      .then(setPollingUnits)
      .catch(e => setMsg({ text: e?.message || 'Failed to load polling units', type: 'err' }))
      .finally(() => setLoadState(p => ({ ...p, pu: false })));

    apiRequest<any[]>('/nimc-records/')
      .then(setNimcRecords)
      .catch(e => setMsg({ text: e?.message || 'Failed to load NIMC records', type: 'err' }))
      .finally(() => setLoadState(p => ({ ...p, nimc: false })));

    apiRequest<any[]>('/audit-logs/')
      .then(setLogs)
      .catch(e => setMsg({ text: e?.message || 'Failed to load audit logs', type: 'err' }))
      .finally(() => setLoadState(p => ({ ...p, logs: false })));
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>, type: 'polling-units' | 'nimc' | 'invitations') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const parsedRows = parseCSV(text);
      if (parsedRows.length < 2) {
        alert("Invalid CSV file. Must include a header row and at least one data row.");
        return;
      }

      const headers = parsedRows[0];
      const dataRows = parsedRows.slice(1).filter(r => r.length > 0 && r.some(cell => cell.trim() !== ""));

      let items: any[] = [];
      let url = "";

      if (type === 'polling-units') {
        items = dataRows.map(row => mapRowToPu(row, headers));
        url = "/polling-units/";
      } else if (type === 'nimc') {
        items = dataRows.map(row => mapRowToNimc(row, headers));
        url = "/nimc-records/";
      } else if (type === 'invitations') {
        items = dataRows.map(row => mapRowToInvite(row, headers));
        url = "/onboarding/invite/";
      }

      try {
        const response = await apiRequest<any>(url, 'POST', items);
        setMsg({ text: response.message || `Successfully imported ${items.length} records!`, type: 'ok' });
        fetchData();
      } catch (err: any) {
        setMsg({ text: "Import failed: " + err.message, type: 'err' });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email) {
      setInviteErr("Email is required.");
      return;
    }
    setSendingInvite(true);
    setInviteErr(null);
    setMsg(null);
    try {
      const res = await apiRequest<any>('/onboarding/invite/', 'POST', inviteForm);
      setMsg({ text: res.message, type: 'ok' });
      setInviteForm({ email: '', role: 'po', polling_unit_id: '' });
      const [invs, met] = await Promise.all([
        apiRequest<any[]>('/onboarding/invitations/'),
        apiRequest<any>('/secretary/metrics/')
      ]);
      setInvitations(invs);
      setMetrics(met);
    } catch (err: any) {
      setInviteErr(err.message || "Failed to send invitation.");
    } finally {
      setSendingInvite(false);
    }
  };

  const handleResendInvite = async (id: number, email: string) => {
    setResending(p => ({ ...p, [id]: true }));
    setMsg(null);
    try {
      const res = await apiRequest<any>(`/onboarding/invite/${id}/resend/`, 'POST');
      setMsg({ text: res.message, type: 'ok' });
    } catch (e: any) {
      setMsg({ text: e?.message || `Failed to resend invitation to ${email}`, type: 'err' });
    } finally {
      setResending(p => ({ ...p, [id]: false }));
    }
  };

  const handleReviewAccreditation = async (id: number, decision: 'approve' | 'reject') => {
    let notes = 'Approved';
    if (decision === 'reject') {
      const promptNotes = prompt('Please enter rejection notes / reasons:');
      if (promptNotes === null) return;
      notes = promptNotes || 'Does not meet organization criteria';
    }

    setReviewing(p => ({ ...p, [id]: true }));
    setMsg(null);
    try {
      const res = await apiRequest<any>(`/onboarding/accreditation/${id}/review/`, 'POST', { decision, notes });
      setMsg({ text: res.message, type: 'ok' });
      const [acc, invs, met] = await Promise.all([
        apiRequest<any[]>('/onboarding/accreditation/'),
        apiRequest<any[]>('/onboarding/invitations/'),
        apiRequest<any>('/secretary/metrics/')
      ]);
      setAccreditations(acc);
      setInvitations(invs);
      setMetrics(met);
    } catch (e: any) {
      setMsg({ text: e?.message || 'Accreditation review failed', type: 'err' });
    } finally {
      setReviewing(p => ({ ...p, [id]: false }));
    }
  };

  const isRolePuBound = ['po', 'apo', 'agent'].includes(inviteForm.role);

  // Filtered datasets
  const filteredElections = elections.filter(el => {
    const matchesSearch = el.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || el.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredAccreditations = accreditations.filter(acc => {
    const matchesSearch = acc.organization_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          acc.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          acc.contact_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || acc.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredInvitations = invitations.filter(inv => {
    const matchesSearch = inv.invited_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inv.staff_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || 
                          inv.role === statusFilter || 
                          (statusFilter === 'used' && inv.is_used) ||
                          (statusFilter === 'pending' && !inv.is_used);
    return matchesSearch && matchesFilter;
  });

  const filteredPollingUnits = pollingUnits.filter(pu => {
    const matchesSearch = pu.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          pu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          pu.ward.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          pu.lga.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || pu.state === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredNimcRecords = nimcRecords.filter(nm => {
    const matchesSearch = nm.nin.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          nm.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          nm.lga.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || nm.state === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.object_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || log.action === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`rounded-xl p-4 text-xs font-semibold ${msg.type === 'ok' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
          {msg.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-4 mb-6">
        {[
          { id: 'metrics', label: 'Overview & Metrics' },
          { id: 'invitations', label: 'Staff Onboarding' },
          { id: 'accreditations', label: `Accreditation Requests (${accreditations.filter(a => a.status === 'pending').length})` },
          { id: 'elections', label: 'Elections (Read-Only)' },
          { id: 'pollingUnits', label: 'Polling Units (Read-Only)' },
          { id: 'nimc', label: 'NIMC Register (Read-Only)' },
          { id: 'logs', label: 'System Audit Logs' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setMsg(null); setSearchQuery(""); setStatusFilter("all"); }}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
              activeTab === tab.id 
                ? 'bg-brand text-white' 
                : 'bg-card text-muted-foreground border border-border hover:bg-muted/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      {activeTab !== 'metrics' && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between bg-card p-4 rounded-xl border border-border">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Search ${
                activeTab === 'elections' ? 'elections by title...' :
                activeTab === 'accreditations' ? 'accreditations by name/org/email...' :
                activeTab === 'invitations' ? 'invitations by email/staff ID...' :
                activeTab === 'pollingUnits' ? 'polling units by code/name/ward/LGA...' :
                activeTab === 'nimc' ? 'NIMC citizens by NIN/name/LGA...' :
                activeTab === 'logs' ? 'audit logs by username/model/object...' :
                'records...'
              }`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs outline-none focus:border-brand"
            />
          </div>

          <div className="flex gap-2">
            {activeTab === 'elections' && (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand"
              >
                <option value="all">All Statuses</option>
                <option value="drafted">Drafted</option>
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="collation">Collation</option>
                <option value="closed">Closed</option>
              </select>
            )}

            {activeTab === 'accreditations' && (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            )}

            {activeTab === 'invitations' && (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand"
              >
                <option value="all">All Roles & Status</option>
                <option value="pending">Pending Invitation</option>
                <option value="used">Activated Account</option>
                <option value="commissioner">INEC Commissioner</option>
                <option value="secretary">INEC Secretary</option>
                <option value="ro">Returning Officer</option>
                <option value="co">Collation Officer</option>
                <option value="po">Presiding Officer</option>
                <option value="apo">Assistant Presiding Officer</option>
                <option value="spo">Supervisory Presiding Officer</option>
                <option value="auditor">Auditor</option>
              </select>
            )}

            {(activeTab === 'pollingUnits' || activeTab === 'nimc') && (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand"
              >
                <option value="all">All States</option>
                {NIGERIAN_STATES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            )}

            {activeTab === 'logs' && (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand"
              >
                <option value="all">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: METRICS OVERVIEW */}
      {activeTab === 'metrics' && metrics && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Voters</p>
              <p className="mt-2 text-3xl font-bold font-mono text-brand">{metrics.total_voters?.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Votes Cast</p>
              <p className="mt-2 text-3xl font-bold font-mono text-emerald-600">{metrics.total_votes_cast?.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Polling Units</p>
              <p className="mt-2 text-3xl font-bold font-mono text-blue-600">{metrics.total_polling_units?.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Elections</p>
              <p className="mt-2 text-3xl font-bold font-mono text-purple-600">{metrics.total_elections?.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm text-center col-span-1">
              <Users className="h-8 w-8 text-brand mx-auto mb-2" />
              <h4 className="text-sm font-bold">Active Staff Directory</h4>
              <p className="text-2xl font-bold font-mono text-brand mt-1">{metrics.total_staff}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Electoral officers currently in database</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm text-center col-span-1">
              <Mail className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold">Onboarding Invitations</h4>
              <p className="text-2xl font-bold font-mono text-amber-500 mt-1">{metrics.total_invitations}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Sent token-based email invites</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm text-center col-span-1">
              <FileText className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold">Accreditations Logged</h4>
              <p className="text-2xl font-bold font-mono text-purple-500 mt-1">{metrics.total_accreditations}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Media and Observer applications submitted</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF ONBOARDING */}
      {activeTab === 'invitations' && (
        <div className="grid gap-6 md:grid-cols-3">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm self-start">
            <h3 className="font-display text-base font-bold border-b border-border pb-3 mb-4">Onboard Official</h3>
            
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase text-muted-foreground">Official Email *</label>
                <input
                  type="email"
                  placeholder="name@email.com"
                  value={inviteForm.email}
                  onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase text-muted-foreground">Staff ID (Autogenerated)</label>
                <input
                  type="text"
                  readOnly
                  placeholder="STAFF-[ROLE]-[RANDOM_ID]"
                  className="w-full mt-1 rounded-lg border border-input bg-muted px-3 py-2 text-xs outline-none cursor-not-allowed font-mono text-muted-foreground"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase text-muted-foreground">Electoral Role *</label>
                <select
                  value={inviteForm.role}
                  onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full mt-1 rounded-lg border border-input bg-card px-3 py-2 text-xs outline-none focus:border-brand"
                >
                  <option value="commissioner">INEC Commissioner (HQ)</option>
                  <option value="secretary">INEC Secretary (HQ)</option>
                  <option value="ro">Returning Officer (RO)</option>
                  <option value="co">Collation Officer (CO)</option>
                  <option value="po">Presiding Officer (PO)</option>
                  <option value="apo">Assistant Presiding Officer (APO)</option>
                  <option value="spo">Supervisory Presiding Officer (SPO)</option>
                  <option value="auditor">Cybersecurity Auditor</option>
                </select>
              </div>

              {isRolePuBound && (
                <div>
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">Assigned Polling Unit</label>
                  <select
                    value={inviteForm.polling_unit_id}
                    onChange={e => setInviteForm(p => ({ ...p, polling_unit_id: e.target.value }))}
                    className="w-full mt-1 rounded-lg border border-input bg-card px-3 py-2 text-xs outline-none focus:border-brand"
                  >
                    <option value="">Select Polling Unit...</option>
                    {pollingUnits.map(pu => (
                      <option key={pu.id} value={pu.id}>{pu.name} ({pu.id})</option>
                    ))}
                  </select>
                </div>
              )}

              {inviteErr && (
                <p className="rounded-md bg-destructive/10 p-2.5 text-[10px] text-destructive leading-relaxed font-semibold">
                  {inviteErr}
                </p>
              )}

              <button
                type="submit"
                disabled={sendingInvite}
                className="w-full rounded-lg bg-brand py-2 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {sendingInvite ? 'Generating invite…' : '📨 Generate Invitation'}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 mb-4">
              <h3 className="font-display text-base font-bold">Onboarding Invitations Logs</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportToCSV(filteredInvitations, ['staff_number', 'invited_email', 'role', 'is_used', 'expires_at'], ['Staff Number', 'Email Address', 'Role', 'Is Activated', 'Expires At'], 'staff_invitations.csv')}
                  className="inline-flex items-center gap-1 rounded-lg border border-input bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted transition"
                >
                  📥 Export CSV
                </button>
                <label className="inline-flex items-center gap-1 rounded-lg border border-input bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted transition cursor-pointer">
                  📤 Bulk Invite (CSV)
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => handleImportCSV(e, 'invitations')} />
                </label>
                <button onClick={fetchData} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                  <RotateCw className="h-4 w-4" />
                </button>
              </div>
            </div>


            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase text-[10px]">
                    <th className="py-2.5 px-3">Staff Number</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan={5} className="py-8 text-center text-muted-foreground animate-pulse">Loading invitations...</td></tr>
                  ) : filteredInvitations.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No matching invitations found.</td></tr>
                  ) : (
                    filteredInvitations.map(inv => {
                      const isExpired = new Date(inv.expires_at) < new Date();
                      const statusLabel = inv.is_used ? 'Activated' : isExpired ? 'Expired' : 'Pending';
                      const link = `${window.location.origin}/onboard?token=${inv.token}`;
                      return (
                        <tr key={inv.id} className="hover:bg-muted/20 align-middle">
                          <td className="py-2.5 px-3 font-mono font-bold text-foreground">{inv.staff_number}</td>
                          <td className="py-2.5 px-3">{inv.invited_email}</td>
                          <td className="py-2.5 px-3 uppercase text-[10px]">{inv.role}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block rounded px-2 py-0.5 text-[8px] font-bold uppercase ${
                              statusLabel === 'Activated' ? 'bg-success/10 text-success' :
                              statusLabel === 'Expired' ? 'bg-destructive/10 text-destructive' :
                              'bg-amber-500/10 text-amber-500'
                            }`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1">
                            {statusLabel === 'Pending' ? (
                              <>
                                <button
                                  disabled={resending[inv.id]}
                                  onClick={() => handleResendInvite(inv.id, inv.invited_email)}
                                  className="inline-block bg-primary-soft text-brand-dark rounded px-2 py-1 text-[9px] hover:bg-brand/10 transition font-semibold disabled:opacity-50"
                                >
                                  {resending[inv.id] ? '⏳ Resending…' : '✉️ Send Mail'}
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(link);
                                    alert('Activation URL copied to clipboard!');
                                  }}
                                  className="inline-block border border-input rounded px-2 py-1 text-[9px] hover:bg-muted transition"
                                >
                                  Copy Link
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-muted-foreground font-mono">Inactive</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: ACCREDITATIONS */}
      {activeTab === 'accreditations' && (
        <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden p-6">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
            <h3 className="font-display text-lg font-bold">Accreditation Requests</h3>
            <button onClick={fetchData} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
              <RotateCw className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground mb-6">
            Review submitted media licences and observer credentials. Approving an application will generate a secure onboarding link and trigger automated notification emails.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[10px]">
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Reference ID</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground animate-pulse">Loading applications...</td></tr>
                ) : filteredAccreditations.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No matching accreditation applications found.</td></tr>
                ) : (
                  filteredAccreditations.map(acc => (
                    <tr key={acc.id} className="hover:bg-muted/30 align-top">
                      <td className="py-3 px-4 font-bold text-foreground">{acc.organization_name}</td>
                      <td className="py-3 px-4 capitalize">{acc.applicant_type.replace('_', ' ')}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold">{acc.contact_name}</span> <br/>
                        <span className="text-[10px] text-muted-foreground">{acc.contact_email}</span>
                      </td>
                      <td className="py-3 px-4 font-mono">{acc.organization_id}</td>
                      <td className="py-3 px-4 max-w-xs truncate">{acc.mandate_description}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase ${
                          acc.status === 'approved' ? 'bg-success/15 text-success' :
                          acc.status === 'rejected' ? 'bg-destructive/15 text-destructive' :
                          'bg-amber-500/15 text-amber-500'
                        }`}>
                          {acc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {acc.status === 'pending' ? (
                          <>
                            <button
                              disabled={reviewing[acc.id]}
                              onClick={() => handleReviewAccreditation(acc.id, 'approve')}
                              className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              disabled={reviewing[acc.id]}
                              onClick={() => handleReviewAccreditation(acc.id, 'reject')}
                              className="rounded bg-destructive px-2 py-1 text-[10px] font-bold text-white hover:bg-destructive-dark disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: ELECTIONS (READ-ONLY) */}
      {activeTab === 'elections' && (
        <section className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
            <h3 className="font-display text-lg font-bold">Elections Registry</h3>
            <button onClick={fetchData} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
              <RotateCw className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[10px]">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 font-mono">Candidates</th>
                  <th className="py-3 px-4">Created By</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredElections.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No matching elections found.</td></tr>
                ) : (
                  filteredElections.map(el => (
                  <tr key={el.id} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-bold text-foreground">{el.title}</td>
                    <td className="py-3 px-4 capitalize">{el.election_type_display}</td>
                    <td className="py-3 px-4 font-mono">{el.date}</td>
                    <td className="py-3 px-4 font-mono">{el.candidate_count} candidates</td>
                    <td className="py-3 px-4 text-muted-foreground">{el.created_by_name || 'System'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block rounded px-2.5 py-0.5 text-[9px] font-bold uppercase ${STATUS_COLOURS[el.status]}`}>
                        {el.status}
                      </span>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 5: POLLING UNITS (READ-ONLY) */}
      {activeTab === 'pollingUnits' && (
        <section className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4 mb-6">
            <h3 className="font-display text-lg font-bold">INEC Registered Polling Units</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportToCSV(filteredPollingUnits, ['id', 'name', 'ward', 'lga', 'state', 'registered_voters_count'], ['Code / ID', 'Name', 'Ward', 'LGA', 'State', 'Registered Voters'], 'polling_units.csv')}
                className="inline-flex items-center gap-1 rounded-lg border border-input bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted transition"
              >
                📥 Export CSV
              </button>
              <button onClick={fetchData} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                <RotateCw className="h-4 w-4" />
              </button>
            </div>
          </div>


          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[10px]">
                  <th className="py-3 px-4">Code / ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Ward / LGA</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4">Officers</th>
                  <th className="py-3 px-4 font-mono">Registered Voters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPollingUnits.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No matching polling units found.</td></tr>
                ) : (
                  filteredPollingUnits.map(pu => (
                  <tr key={pu.id} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">{pu.id}</td>
                    <td className="py-3 px-4">{pu.name}</td>
                    <td className="py-3 px-4">{pu.ward} Ward, {pu.lga}</td>
                    <td className="py-3 px-4">{pu.state}</td>
                    <td className="py-3 px-4 space-y-0.5">
                      <p className="text-[10px]"><span className="font-semibold text-muted-foreground">PO:</span> {pu.presiding_officer_name || 'Unassigned'}</p>
                      <p className="text-[10px]"><span className="font-semibold text-muted-foreground">CO:</span> {pu.collation_officer_name || 'Unassigned'}</p>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold">{pu.registered_voters_count?.toLocaleString()}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 6: NIMC REGISTER (READ-ONLY) */}
      {activeTab === 'nimc' && (
        <section className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4 mb-6">
            <h3 className="font-display text-lg font-bold">National NIMC Identity Database</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportToCSV(filteredNimcRecords, ['nin', 'full_name', 'state', 'lga', 'biometric_hash'], ['NIN', 'Full Name', 'State', 'LGA', 'Biometric Hash'], 'nimc_records.csv')}
                className="inline-flex items-center gap-1 rounded-lg border border-input bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted transition"
              >
                📥 Export CSV
              </button>
              <label className="inline-flex items-center gap-1 rounded-lg border border-input bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted transition cursor-pointer">
                📤 Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={(e) => handleImportCSV(e, 'nimc')} />
              </label>
              <button onClick={fetchData} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                <RotateCw className="h-4 w-4" />
              </button>
            </div>
          </div>


          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[10px]">
                  <th className="py-3 px-4">NIN</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Origin (State / LGA)</th>
                  <th className="py-3 px-4">Biometric Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredNimcRecords.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No matching citizen records found.</td></tr>
                ) : (
                  filteredNimcRecords.map(nm => (
                  <tr key={nm.id} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">{nm.nin}</td>
                    <td className="py-3 px-4">{nm.full_name}</td>
                    <td className="py-3 px-4">{nm.lga}, {nm.state} State</td>
                    <td className="py-3 px-4 font-mono text-[10px] text-muted-foreground truncate max-w-xs">{nm.biometric_hash}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 7: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              <h2 className="font-display text-lg font-bold">Cybersecurity & CRUD Operations Audit Stream</h2>
            </div>
            <button onClick={fetchData} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><RotateCw className="h-4 w-4" /></button>
          </div>

          <div className="space-y-4">
            {filteredLogs.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">No matching CRUD audit entries found.</p>
            ) : (
              <ul className="divide-y divide-border font-mono text-xs">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLog === log.id;
                  const isDelete = log.action === 'DELETE';
                  const isCreate = log.action === 'CREATE';
                  const isUpdate = log.action === 'UPDATE';
                  return (
                    <li key={log.id} className="py-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            isDelete ? "bg-red-500/10 text-red-500" :
                            isCreate ? "bg-emerald-500/10 text-emerald-500" :
                            "bg-blue-500/10 text-blue-500"
                          }`}>
                            {log.action}
                          </span>
                          <span className="font-semibold text-foreground">{log.model_name}</span>
                          <span className="text-muted-foreground">ID: {log.object_id}</span>
                          <span className="text-muted-foreground">by</span>
                          <span className="text-brand font-bold">{log.username} ({log.role})</span>
                        </div>

                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>IP: {log.ip_address || "127.0.0.1"}</span>
                          <span>{log.timestamp.substring(11,19)}</span>
                          <button 
                            onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                            className="rounded border border-input px-2 py-0.5 text-[9px] font-semibold text-muted-foreground hover:bg-muted"
                          >
                            {isExpanded ? "Collapse" : "JSON Diff"}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 rounded-lg border border-border bg-muted/50 p-3 text-[10px] text-muted-foreground overflow-x-auto max-h-48">
                          <p className="font-bold text-foreground mb-1 uppercase tracking-wider text-[8px]">Instance State Payload:</p>
                          <pre className="whitespace-pre-wrap">{JSON.stringify(JSON.parse(log.details || '{}'), null, 2)}</pre>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}


// --- SUB-DASHBOARD: REGISTERED VOTER ---
function VoterDashboard({ elections, loading }: { elections: Election[], loading: boolean }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = elections.filter(el => {
    const matchesSearch = el.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = statusFilter === 'all' || 
      (statusFilter === 'active' && el.status === 'active') ||
      (statusFilter === 'upcoming' && el.status === 'upcoming') ||
      (statusFilter === 'voted' && el.has_voted);
    return matchesSearch && matchesFilter;
  });

  const ballotsCast = elections.filter((e) => e.has_voted).length;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Active elections" value={String(elections.filter((e) => e.status === "active").length)} />
        <Stat label="Ballots cast" value={String(ballotsCast)} />
        <Stat label="Voice guidance" value="On" />
      </div>

      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Upcoming & Active Ballots</h2>
            <p className="text-sm text-muted-foreground">Tap an election to review candidates and cast your vote.</p>
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search ballots..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="rounded-lg border border-input bg-card pl-8 pr-2.5 py-1.5 text-xs outline-none focus:border-brand w-40"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs outline-none focus:border-brand"
            >
              <option value="all">All Ballots</option>
              <option value="active">Open Now</option>
              <option value="upcoming">Upcoming</option>
              <option value="voted">Ballots Cast</option>
            </select>
            {(() => {
              const activeElections = elections.filter(e => e.status === "active");
              const allActiveVoted = activeElections.length > 0 ? activeElections.every(e => e.has_voted) : true;
              return allActiveVoted ? (
                <Link to="/results" className="hidden text-sm font-semibold text-brand hover:underline sm:inline">View live results →</Link>
              ) : (
                <span className="hidden text-sm font-semibold text-muted-foreground opacity-50 cursor-not-allowed sm:inline" title="You must cast all active ballots to view live results">Complete ballots for results</span>
              );
            })()}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 w-full animate-pulse rounded-xl bg-card border border-border" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-xs">
            No matching ballots found.
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((el) => {
              const voted = el.has_voted;
              const active = el.status === "active";
              const inner = (
                <>
                  <div className="flex items-center gap-4">
                    <span className={`grid h-11 w-11 place-items-center rounded-lg ${active ? "bg-primary-soft text-brand-dark" : "bg-muted text-muted-foreground"}`}>
                      {voted ? <CheckCircle2 className="h-5 w-5" /> : <Vote className="h-5 w-5" />}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{el.title}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" /> {el.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-block ${
                      voted ? "bg-success/15 text-success" :
                      active ? "bg-primary-soft text-brand-dark" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {voted ? "Ballot cast" : active ? "Open now" : "Upcoming"}
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-brand" />
                  </div>
                </>
              );
              const cls = `group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition ${
                active ? "hover:border-brand hover:shadow-md" : "opacity-70 cursor-not-allowed"
              }`;
              return (
                <li key={el.id}>
                  {active ? (
                    <Link to="/vote/$id" params={{ id: el.id }} className={cls}>{inner}</Link>
                  ) : (
                    <div className={cls} aria-disabled="true">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// --- SUB-DASHBOARD: PRESIDING OFFICER (PO) ---
function PresidingOfficerDashboard() {
  const [accreditNin, setAccreditNin] = useState("");
  const [accreditationMsg, setAccreditationMsg] = useState<string | null>(null);
  const [accreditationErr, setAccreditationErr] = useState<string | null>(null);
  const [accrediting, setAccrediting] = useState(false);

  // Result Form Fields
  const [accreditedVotersCount, setAccreditedVotersCount] = useState(125);
  const [totalVotesCast, setTotalVotesCast] = useState(120);
  const [formUrl, setFormUrl] = useState("http://irev.inec.gov.ng/forms/EC8A-Ikeja-01.pdf");
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Disputes
  const [disputes, setDisputes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchDisputes();
  }, []);

  const filteredDisputes = disputes.filter(d => {
    const matchesSearch = d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.raised_by_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || 
                          (statusFilter === 'resolved' && d.is_resolved) ||
                          (statusFilter === 'open' && !d.is_resolved);
    return matchesSearch && matchesFilter;
  });

  const fetchDisputes = async () => {
    try {
      const data = await apiRequest("/disputes/");
      setDisputes(data);
    } catch (e) {}
  };

  const handleAccredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{11}$/.test(accreditNin)) {
      setAccreditationErr("NIN must be exactly 11 digits.");
      return;
    }
    setAccreditationErr(null);
    setAccreditationMsg(null);
    setAccrediting(true);

    try {
      // Simulate BVAS Lookup & verification handshake
      // Since it's a demo, we verify the NIN exists in NIMC database first
      // by attempting to register it, or we can just send it as a successful mockup check.
      setTimeout(() => {
        setAccrediting(false);
        setAccreditationMsg(`Voter successfully Accredited via BVAS! Biometrics Match. NIN: ${accreditNin}`);
        setAccreditedVotersCount(prev => prev + 1);
        setAccreditNin("");
      }, 1500);
    } catch (err: any) {
      setAccreditationErr(err.message || "Accreditation failed.");
      setAccrediting(false);
    }
  };

  const handleUploadEC8A = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadErr(null);
    setUploadMsg(null);
    setUploading(true);

    // Cryptographic signature
    const signature = "SIG-" + Math.random().toString(36).substring(2, 10).toUpperCase() + "-" + Date.now();

    try {
      await apiRequest("/results-sheets/", "POST", {
        election: "presidential-2027",
        polling_unit: "PU-24-05-11", // Ikeja PU 1
        scanned_form_url: formUrl,
        accredited_voters: accreditedVotersCount,
        total_votes_cast: totalVotesCast,
        po_digital_signature: signature,
        is_countersigned_by_agents: true
      });
      setUploadMsg("Form EC8A Result Sheet successfully signed and uploaded to IReV!");
    } catch (err: any) {
      setUploadErr(err.message || "Failed to upload Result Sheet.");
    } finally {
      setUploading(false);
    }
  };

  const resolveDispute = async (id: number) => {
    try {
      await apiRequest(`/disputes/${id}/resolve/`, "POST");
      fetchDisputes();
    } catch (e) {}
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* BVAS Accreditation Panel */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
          <Cpu className="h-5 w-5 text-emerald-600" />
          <h2 className="font-display text-lg font-bold">BVAS Accreditation Terminal</h2>
        </div>
        
        <form onSubmit={handleAccredit} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Bimodal Voter Accreditation: Scan biometric details of the arriving citizen to verify and accredit them to vote.
          </p>
          <div className="flex gap-2">
            <input
              placeholder="Enter Voter 11-digit NIN..."
              value={accreditNin}
              onChange={(e) => setAccreditNin(e.target.value.replace(/\D/g, ""))}
              maxLength={11}
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button type="submit" disabled={accrediting} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
              {accrediting ? "Accrediting..." : "Accredit"}
            </button>
          </div>
          {accreditationMsg && <p className="rounded-md bg-emerald-500/10 p-3 text-xs text-emerald-600 font-semibold">{accreditationMsg}</p>}
          {accreditationErr && <p className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">{accreditationErr}</p>}
        </form>

        <div className="mt-6 rounded-lg bg-primary-soft/40 p-4 border border-brand/10">
          <div className="flex items-center justify-between text-xs text-brand-dark">
            <span>Live PU Voter Count:</span>
            <span className="font-bold font-mono text-sm">{accreditedVotersCount} Accredited</span>
          </div>
        </div>
      </section>

      {/* EC8A Result Sheet Upload Panel */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
          <FileText className="h-5 w-5 text-brand" />
          <h2 className="font-display text-lg font-bold">Upload Form EC8A (Result Sheet)</h2>
        </div>
        
        <form onSubmit={handleUploadEC8A} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Once voting ends, enter aggregate counts and upload a scanned image/PDF of the physically signed Form EC8A sheet.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase">Accredited Voters</label>
              <input 
                type="number" 
                value={accreditedVotersCount} 
                onChange={(e) => setAccreditedVotersCount(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" 
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase">Total Votes Cast</label>
              <input 
                type="number" 
                value={totalVotesCast} 
                onChange={(e) => setTotalVotesCast(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" 
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase">Scanned Form EC8A Document Link</label>
            <input 
              type="text" 
              value={formUrl} 
              onChange={(e) => setFormUrl(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none font-mono text-xs" 
            />
          </div>
          {uploadMsg && <p className="rounded-md bg-emerald-500/10 p-3 text-xs text-emerald-600 font-semibold">{uploadMsg}</p>}
          {uploadErr && <p className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">{uploadErr}</p>}
          
          <button type="submit" disabled={uploading} className="w-full rounded-lg bg-brand py-2.5 text-xs font-semibold text-white hover:bg-brand-dark">
            {uploading ? "Signing & Syncing to IReV..." : "Sign and Submit Result Sheet"}
          </button>
        </form>
      </section>

      {/* Disputes Panel */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="font-display text-lg font-bold">Disputes & Incident Logs</h2>
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search disputes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="rounded-lg border border-input bg-background pl-8 pr-2.5 py-1.5 text-xs outline-none focus:border-brand w-40"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs outline-none focus:border-brand"
            >
              <option value="all">All Status</option>
              <option value="open">Open Only</option>
              <option value="resolved">Resolved Only</option>
            </select>
            <button onClick={fetchDisputes} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><RotateCw className="h-4 w-4" /></button>
          </div>
        </div>

        {filteredDisputes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl">No matching disputes logged.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filteredDisputes.map((d) => (
              <li key={d.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{d.raised_by_name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{d.timestamp.substring(11,16)}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase ${d.is_resolved ? "bg-success/10 text-success" : "bg-amber-500/10 text-amber-500"}`}>
                      {d.is_resolved ? "Resolved" : "Open"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{d.description}</p>
                </div>
                {!d.is_resolved && (
                  <button onClick={() => resolveDispute(d.id)} className="rounded bg-brand px-3 py-1.5 text-[10px] font-bold text-white hover:bg-brand-dark">
                    Resolve
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// --- SUB-DASHBOARD: COLLATION OFFICER (CO) ---
function CollationOfficerDashboard({ elections }: { elections: Election[] }) {
  const [sheets, setSheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchSheets();
  }, []);

  const filteredSheets = sheets.filter(s => {
    const matchesSearch = s.polling_unit_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.polling_unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.presiding_officer_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || 
                          (statusFilter === 'overvoting' && s.flagged_for_overvoting) ||
                          (statusFilter === 'verified' && !s.flagged_for_overvoting);
    return matchesSearch && matchesFilter;
  });

  const fetchSheets = async () => {
    try {
      setLoading(true);
      const data = await apiRequest("/results-sheets/");
      setSheets(data);
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string, action: 'verify' | 'flag') => {
    try {
      await apiRequest(`/results-sheets/${id}/verify/`, "POST", { action });
      fetchSheets();
    } catch (e) {}
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4 mb-6">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-brand" />
          <h2 className="font-display text-lg font-bold">Ward & LGA Collation Center</h2>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search polling units..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="rounded-lg border border-input bg-background pl-8 pr-2.5 py-1.5 text-xs outline-none focus:border-brand w-48"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs outline-none focus:border-brand"
          >
            <option value="all">All Results</option>
            <option value="verified">Verified Only</option>
            <option value="overvoting">Overvoting Flagged</option>
          </select>
          <button onClick={fetchSheets} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><RotateCw className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border text-muted-foreground uppercase text-[10px]">
              <th className="py-3 px-4">Polling Unit</th>
              <th className="py-3 px-4">Presiding Officer</th>
              <th className="py-3 px-4">Accredited</th>
              <th className="py-3 px-4">Votes Cast</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={6} className="py-8 text-center text-muted-foreground animate-pulse">Loading collations...</td></tr>
            ) : filteredSheets.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No matching result sheets found.</td></tr>
            ) : (
              filteredSheets.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="py-3 px-4 font-semibold text-foreground">{s.polling_unit_name} <br/><span className="text-[10px] text-muted-foreground font-mono">{s.polling_unit}</span></td>
                  <td className="py-3 px-4">{s.presiding_officer_name}</td>
                  <td className="py-3 px-4 font-mono font-semibold">{s.accredited_voters}</td>
                  <td className="py-3 px-4 font-mono font-semibold">{s.total_votes_cast}</td>
                  <td className="py-3 px-4 text-center">
                    {s.flagged_for_overvoting ? (
                      <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-0.5 text-[8px] font-bold text-destructive">
                        <AlertTriangle className="h-3 w-3" /> OVERVOTING
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-success/10 px-2 py-0.5 text-[8px] font-bold text-success">
                        <Check className="h-3 w-3" /> VERIFIED
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <a href={s.scanned_form_url} target="_blank" rel="noreferrer" className="inline-block rounded border border-input px-2 py-1 text-[10px] font-bold text-muted-foreground hover:bg-muted">
                      View Form
                    </a>
                    {s.flagged_for_overvoting ? (
                      <button onClick={() => handleVerify(s.id, 'verify')} className="rounded bg-brand px-2.5 py-1 text-[10px] font-bold text-white hover:bg-brand-dark">
                        Clear Flag
                      </button>
                    ) : (
                      <button onClick={() => handleVerify(s.id, 'flag')} className="rounded bg-destructive px-2.5 py-1 text-[10px] font-bold text-white hover:bg-destructive-dark">
                        Flag
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// --- SUB-DASHBOARD: RETURNING OFFICER (RO) ---
function ReturningOfficerDashboard({ elections }: { elections: Election[] }) {
  const [signing, setSigning] = useState<Record<string, boolean>>({});
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "pending" | "error">("success");
  const [approvalData, setApprovalData] = useState<Record<string, { approvals: number; required: number; signature: string }>>({});
  const [signedIds, setSignedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredElections = elections.filter(el => {
    const matchesSearch = el.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          el.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || el.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const handleApproveClosure = async (id: string) => {
    const confirmed = window.confirm(
      "⚠️ By signing this election closure, you are legally attesting that all results from your constituency are accurate and final.\n\nThis action is cryptographically logged and immutable.\n\nProceed?"
    );
    if (!confirmed) return;

    setSigning(prev => ({ ...prev, [id]: true }));
    setStatusMsg(null);
    try {
      const res = await apiRequest(`/elections/${id}/approve-closure/`, "POST", {
        notes: "Signed via RO Dashboard"
      });
      setApprovalData(prev => ({
        ...prev,
        [id]: { approvals: res.approvals, required: res.required, signature: res.your_signature }
      }));
      setSignedIds(prev => [...prev, id]);

      if (res.status === "closed") {
        setStatusType("success");
        setStatusMsg(`✅ ${res.message}`);
        setTimeout(() => window.location.reload(), 2500);
      } else {
        setStatusType("pending");
        setStatusMsg(`⏳ ${res.message}`);
      }
    } catch (e: any) {
      setStatusType("error");
      setStatusMsg(e.message || "Failed to submit closure approval.");
    } finally {
      setSigning(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4 mb-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-yellow-500" />
          <h2 className="font-display text-lg font-bold">Constituency Return &amp; Multi-Sig Election Declaration</h2>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search elections..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="rounded-lg border border-input bg-background pl-8 pr-2.5 py-1.5 text-xs outline-none focus:border-brand w-48"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs outline-none focus:border-brand"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="collation">Collation</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-yellow-500/8 border border-yellow-500/20 p-4">
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          <strong>⚖️ Multi-Signature Protocol:</strong> Per INEC electoral guidelines, closing an election requires <strong>N signatures from multiple Returning Officers</strong>. 
          Your individual approval is cryptographically signed and recorded. The election transitions to CLOSED only once the required signature threshold is reached.
          This prevents any single officer from unilaterally publishing results.
        </p>
      </div>

      {statusMsg && (
        <div className={`mb-4 rounded-md p-3 text-xs font-semibold ${
          statusType === "success" ? "bg-emerald-500/10 text-emerald-600" :
          statusType === "pending" ? "bg-amber-500/10 text-amber-600" :
          "bg-destructive/10 text-destructive"
        }`}>
          {statusMsg}
        </div>
      )}

      <div className="space-y-4">
        {filteredElections.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl">No matching elections found.</p>
        ) : (
          filteredElections.map((el) => {
          const isClosed = el.status === 'closed';
          const isActive = el.status === 'active';
          const hasAlreadySigned = signedIds.includes(el.id);
          const ad = approvalData[el.id];
          const approvalCount = ad?.approvals ?? (el as any).approval_count ?? 0;
          const required = ad?.required ?? 2;
          const progress = Math.min(100, (approvalCount / required) * 100);

          return (
            <div key={el.id} className="border border-border rounded-xl p-4 bg-surface hover:border-brand/40 transition">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <span className={`inline-block rounded px-2 py-0.5 text-[8px] font-bold uppercase mb-2 ${
                    isClosed ? "bg-muted text-muted-foreground" :
                    isActive ? "bg-emerald-600/10 text-emerald-600" :
                    "bg-amber-500/10 text-amber-500"
                  }`}>
                    {el.status.replace('_', ' ')}
                  </span>
                  <h3 className="font-display text-base font-bold">{el.title}</h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {el.id} · Scheduled: {el.date}</p>

                  {/* Signature Progress Bar */}
                  {!isClosed && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Closure Signatures</span>
                        <span className="font-mono font-bold">{approvalCount} / {required} required</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-yellow-400 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Signature info */}
                  {ad?.signature && (
                    <p className="mt-2 font-mono text-[9px] text-muted-foreground bg-muted/50 rounded px-2 py-1 inline-block">
                      Your sig: {ad.signature}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <Link to="/results" className="inline-flex items-center gap-1 rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted">
                    <BarChart3 className="h-4 w-4" /> Final Tally
                  </Link>
                  {isActive && !hasAlreadySigned && (
                    <button
                      onClick={() => handleApproveClosure(el.id)}
                      disabled={signing[el.id]}
                      className="inline-flex items-center gap-1 rounded-lg bg-yellow-500 px-4 py-2 text-xs font-semibold text-black hover:bg-yellow-600 disabled:opacity-50"
                    >
                      <Lock className="h-4 w-4" />
                      {signing[el.id] ? "Signing…" : "Sign Closure Approval"}
                    </button>
                  )}
                  {hasAlreadySigned && !isClosed && (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600">
                      <Check className="h-4 w-4" /> Signed
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        }))}
      </div>
    </section>
  );
}


// --- SUB-DASHBOARD: PARTY AGENT (POLITICAL OVERSIGHT) ---
function PollingAgentDashboard() {
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Turnout simulation
  const PU_Registered = 1250;
  const [PU_Voted, setPU_Voted] = useState(384);

  useEffect(() => {
    const id = setInterval(() => {
      // Simulate live voter increment
      setPU_Voted(v => Math.min(PU_Registered, v + Math.floor(Math.random() * 3)));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const handleDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setMsg(null);
    setErr(null);
    setLoading(true);

    try {
      await apiRequest("/disputes/", "POST", {
        polling_unit: "PU-24-05-11", // Ikeja PU 1
        description
      });
      setMsg("Incident report logged successfully. INEC Collation officers notified.");
      setDescription("");
    } catch (e: any) {
      setErr(e.message || "Failed to log dispute.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Real-time PU Telemetry */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
          <Activity className="h-5 w-5 text-brand" />
          <h2 className="font-display text-lg font-bold">PU Accreditation Telemetry</h2>
        </div>
        
        <p className="text-xs text-muted-foreground mb-4">
          Live feed of BVAS accreditation count at your assigned Polling Unit: **Ikeja PU 1 (Alausa Primary School)**.
        </p>

        <div className="flex flex-col items-center justify-center py-6">
          <div className="relative h-32 w-32 grid place-items-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--muted)" strokeWidth="8" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--brand)" strokeWidth="8" strokeDasharray="251" strokeDashoffset={251 - (PU_Voted / PU_Registered) * 251} />
            </svg>
            <div className="text-center z-10">
              <span className="text-2xl font-bold font-mono text-foreground">{PU_Voted}</span>
              <span className="text-[9px] block text-muted-foreground uppercase">Accredited</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 font-semibold font-mono">
            PU Turnout: {((PU_Voted / PU_Registered) * 100).toFixed(1)}% ({PU_Registered} registered)
          </p>
        </div>
      </section>

      {/* Log Dispute */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="font-display text-lg font-bold">Raise Dispute / Log Incident</h2>
        </div>

        <form onSubmit={handleDispute} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Has there been a technical BVAS failure, violence, or biometric bypass at this polling unit? File an official dispute report.
          </p>
          <div>
            <textarea
              placeholder="Describe the incident in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-24 rounded-lg border border-input bg-background p-3 text-xs outline-none focus:border-brand"
            />
          </div>
          {msg && <p className="rounded-md bg-emerald-500/10 p-3 text-xs text-emerald-600 font-semibold">{msg}</p>}
          {err && <p className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">{err}</p>}
          
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-yellow-500 py-2.5 text-xs font-semibold text-black hover:bg-yellow-600">
            {loading ? "Filing report..." : "Submit Incident Report"}
          </button>
        </form>
      </section>
    </div>
  );
}

// --- SUB-DASHBOARD: ELECTION OBSERVER ---
function ObserverDashboard() {
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("materials_late");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleObserverLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      await apiRequest("/disputes/", "POST", {
        polling_unit: "PU-24-05-11",
        description: `[Observer Alert - ${category.replace('_',' ').toUpperCase()}]: ${desc}`
      });
      setMsg("Observer report successfully logged in INEC Central Monitoring Dashboard.");
      setDesc("");
    } catch (err: any) {
      alert("Failed to submit observer log");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
          <EyeIcon className="h-5 w-5 text-brand" />
          <h2 className="font-display text-lg font-bold">Independent Observer Incident Portal</h2>
        </div>

        <form onSubmit={handleObserverLog} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Report non-partisan oversight logs. Observers contribute field data for credibility audits.
          </p>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase">Incident Category</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs font-medium outline-none mt-1"
            >
              <option value="materials_late">Late arrival of materials</option>
              <option value="bvas_malfunction">BVAS hardware malfunction</option>
              <option value="voter_intimidation">Voter coercion / intimidation</option>
              <option value="pu_not_opened">Polling unit did not open</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase">Incident Description</label>
            <textarea
              placeholder="Enter details..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full h-24 rounded-lg border border-input bg-background p-3 text-xs outline-none focus:border-brand mt-1"
            />
          </div>
          {msg && <p className="rounded-md bg-emerald-500/10 p-3 text-xs text-emerald-600 font-semibold">{msg}</p>}

          <button type="submit" disabled={loading} className="w-full rounded-lg bg-brand py-2 text-xs font-semibold text-white hover:bg-brand-dark">
            {loading ? "Submitting report..." : "Submit Observer Log"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
          <ShieldCheck className="h-5 w-5 text-brand" />
          <h2 className="font-display text-lg font-bold">Parallel Vote Tabulation (PVT)</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Observers use Parallel Vote Tabulation (PVT) to independently verify the calculations of collation tables.
        </p>
        <div className="rounded-lg bg-primary-soft/30 p-4 border border-border space-y-3">
          <div className="flex justify-between text-xs">
            <span className="font-semibold">Domestic CSO Deployment:</span>
            <span>Accredited</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="font-semibold">Observer Access Level:</span>
            <span>Universal Read-only</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="font-semibold">PVT Integrity Index:</span>
            <span className="font-bold text-emerald-600">99.8% Match Rate</span>
          </div>
        </div>
      </section>
    </div>
  );
}

// --- SUB-DASHBOARD: ACCREDITED MEDIA (READ-ONLY ANALYTICS) ---
function MediaDashboard({ elections }: { elections: Election[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2 text-center py-8">
        <Users className="h-10 w-10 text-brand mx-auto mb-2" />
        <h2 className="font-display text-xl font-bold">Accredited Broadcaster & Journalist Terminal</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-lg mx-auto">
          You are granted high-throughput API endpoints to access collation streams directly, bypassing generic public rate-limiting.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
          <BarChart3 className="h-5 w-5 text-brand" />
          <h2 className="font-display text-lg font-bold">Live Constituency Feed</h2>
        </div>
        <div className="space-y-4">
          {elections.slice(0,2).map(el => (
            <div key={el.id} className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">{el.title}</span>
              <Link to="/results" className="text-brand hover:underline font-bold">View Graphics Board →</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
          <CheckCircle2 className="h-5 w-5 text-brand" />
          <h2 className="font-display text-lg font-bold">Verified Result Forms (EC8A)</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          All result sheets uploaded from the PUs are open for public and press verification on the IReV portal.
        </p>
        <Link to="/results" className="w-full block text-center rounded-lg bg-brand py-2 text-xs font-semibold text-white hover:bg-brand-dark">
          Go to IReV Collation View
        </Link>
      </section>
    </div>
  );
}

// --- SUB-DASHBOARD: CYBERSECURITY AUDITOR ---
function AuditorDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [logsPage, setLogsPage] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.object_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || log.action === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const data = await apiRequest(`/audit-logs/?page=${page}`);
      setLogs(data);
      setLogsPage(page);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4 mb-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-600" />
          <h2 className="font-display text-lg font-bold">Cybersecurity & CRUD Operations Audit Stream</h2>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="rounded-lg border border-input bg-background pl-8 pr-2.5 py-1.5 text-xs outline-none focus:border-brand w-48"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs outline-none focus:border-brand"
          >
            <option value="all">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
          <button onClick={() => fetchLogs(logsPage)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><RotateCw className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-center text-xs text-muted-foreground animate-pulse py-8">Polling security ledger...</p>
        ) : filteredLogs.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">No matching CRUD audit entries found.</p>
        ) : (
          <ul className="divide-y divide-border font-mono text-xs">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLog === log.id;
              const isDelete = log.action === 'DELETE';
              const isCreate = log.action === 'CREATE';
              const isUpdate = log.action === 'UPDATE';
              return (
                <li key={log.id} className="py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        isDelete ? "bg-red-500/10 text-red-500" :
                        isCreate ? "bg-emerald-500/10 text-emerald-500" :
                        "bg-blue-500/10 text-blue-500"
                      }`}>
                        {log.action}
                      </span>
                      <span className="font-semibold text-foreground">{log.model_name}</span>
                      <span className="text-muted-foreground">ID: {log.object_id}</span>
                      <span className="text-muted-foreground">by</span>
                      <span className="text-brand font-bold">{log.username} ({log.role})</span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>IP: {log.ip_address || "127.0.0.1"}</span>
                      <span>{log.timestamp.substring(11,19)}</span>
                      <button 
                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                        className="rounded border border-input px-2 py-0.5 text-[9px] font-semibold text-muted-foreground hover:bg-muted"
                      >
                        {isExpanded ? "Collapse" : "JSON Diff"}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 rounded-lg border border-border bg-muted/50 p-3 text-[10px] text-muted-foreground overflow-x-auto max-h-48">
                      <p className="font-bold text-foreground mb-1 uppercase tracking-wider text-[8px]">Instance State Payload:</p>
                      <pre className="whitespace-pre-wrap">{JSON.stringify(JSON.parse(log.details || '{}'), null, 2)}</pre>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <PaginationControls 
          currentPage={logsPage}
          totalPages={Math.ceil(((logs as any).count || 0) / 50)}
          count={(logs as any).count || logs.length}
          onPageChange={fetchLogs}
        />
      </div>
    </section>
  );
}


// --- GENERIC COMPONENTS ---
function ProfileItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 rounded bg-white/10 p-1.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase text-white/50">{label}</p>
        <p className="text-xs font-semibold text-white truncate">{value}</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
