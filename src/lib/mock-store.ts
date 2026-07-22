// Client-side mock data + session for RemoteVote NG demo.
// SSR-safe: all reads/writes gated to typeof window.

export type Election = {
  id: string;
  title: string;
  date: string;
  status: "active" | "upcoming" | "closed";
};

export type Candidate = {
  id: string;
  name: string;
  party: string;
  partyAbbr: string;
  color: string; // hex
  manifesto: string;
  runningMate?: string;
};

export type Result = {
  candidateId: string;
  votes: number;
};

export const ELECTIONS: Election[] = [
  { id: "presidential-2027", title: "Presidential Election", date: "Feb 25, 2027", status: "active" },
  { id: "senate-2027", title: "National Assembly — Senate", date: "Feb 25, 2027", status: "active" },
  { id: "house-2027", title: "House of Representatives", date: "Feb 25, 2027", status: "upcoming" },
  { id: "governorship-2027", title: "Governorship Election", date: "Mar 11, 2027", status: "upcoming" },
  { id: "assembly-2027", title: "State House of Assembly", date: "Mar 11, 2027", status: "upcoming" },
  { id: "lga-2027", title: "LGA Chairman & Councillor", date: "Apr 8, 2027", status: "upcoming" },
];

export const CANDIDATES: Record<string, Candidate[]> = {
  "presidential-2027": [
    { id: "c1", name: "Adaeze Nwosu", party: "Green Alliance Party", partyAbbr: "GAP", color: "#2e7d32", manifesto: "Renewable energy, youth employment, and transparent governance.", runningMate: "Yusuf Bello" },
    { id: "c2", name: "Musa Abdullahi", party: "Unity Progressive Movement", partyAbbr: "UPM", color: "#1565c0", manifesto: "Security-first agenda, federal restructuring, digital economy.", runningMate: "Ifeoma Eze" },
    { id: "c3", name: "Chinedu Okonkwo", party: "People's Reform Congress", partyAbbr: "PRC", color: "#c62828", manifesto: "Free healthcare, agricultural revolution, anti-corruption courts.", runningMate: "Amina Sani" },
    { id: "c4", name: "Halima Sule", party: "New Dawn Coalition", partyAbbr: "NDC", color: "#6a1b9a", manifesto: "Education overhaul, women in leadership, SME financing.", runningMate: "Peter Adeyemi" },
    { id: "c5", name: "Tunde Alabi", party: "Sovereign Citizens Party", partyAbbr: "SCP", color: "#ef6c00", manifesto: "Local production, tax reform, judicial independence.", runningMate: "Grace Umeh" },
  ],
  "senate-2027": [
    { id: "s1", name: "Ngozi Okafor", party: "Green Alliance Party", partyAbbr: "GAP", color: "#2e7d32", manifesto: "Constituency projects, healthcare access." },
    { id: "s2", name: "Ibrahim Danjuma", party: "Unity Progressive Movement", partyAbbr: "UPM", color: "#1565c0", manifesto: "Infrastructure, security funding." },
    { id: "s3", name: "Blessing Etuk", party: "People's Reform Congress", partyAbbr: "PRC", color: "#c62828", manifesto: "Education budget expansion, oversight reform." },
  ],
};

// Seeded mock live results (baseline + growth)
export const BASE_RESULTS: Record<string, Result[]> = {
  "presidential-2027": [
    { candidateId: "c1", votes: 14_001 },
    { candidateId: "c2", votes: 14_001 },
    { candidateId: "c3", votes: 14_001 },
    { candidateId: "c4", votes: 14_001 },
    { candidateId: "c5", votes: 6_450 },
  ],
};

export type Session = {
  fullName: string;
  nin: string;
  state: string;
  lga: string;
  verified: boolean;
  language: string;
  email?: string;
  role?: string;
  staffNumber?: string;
  voterId?: string;
};

const KEY = "rvng.session.v1";
const VOTES_KEY = "rvng.votes.v1";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session | null) {
  if (typeof window === "undefined") return;
  if (!s) window.localStorage.removeItem(KEY);
  else window.localStorage.setItem(KEY, JSON.stringify(s));
}

export function getVotes(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(VOTES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function recordVote(electionId: string, candidateId: string) {
  if (typeof window === "undefined") return;
  const v = getVotes();
  v[electionId] = candidateId;
  window.localStorage.setItem(VOTES_KEY, JSON.stringify(v));
}

export function formatNumber(n: number) {
  return n.toLocaleString("en-NG");
}

export function generateReceipt(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `RVNG-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}
