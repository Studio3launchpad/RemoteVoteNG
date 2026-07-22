import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { getSession } from "@/lib/mock-store";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Search, ShieldCheck, X } from "lucide-react";
import { apiRequest, Election, Candidate } from "@/lib/api";

export const Route = createFileRoute("/vote/$id")({
  head: () => ({ meta: [{ title: "Cast your ballot — RemoteVote NG" }] }),
  component: VotePage,
});

function VotePage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [query, setQuery] = useState("");
  const [partyFilter, setPartyFilter] = useState<string | null>(null);
  const [letterFilter, setLetterFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [casting, setCasting] = useState(false);

  useEffect(() => {
    if (!getSession()) {
      nav({ to: "/" });
      return;
    }

    const fetchElectionData = async () => {
      try {
        setLoading(true);
        const data = await apiRequest<Election>(`/elections/${id}/`);
        setElection(data);
        if (data.has_voted) {
          setAlreadyVoted(true);
          // Look up which candidate they voted for (wait, for anonymity, backend doesn't tell which candidate they voted for!
          // So we don't select any specific candidate on screen for them, or we can leave it empty, which is correct for secret ballots!)
        }
      } catch (err: any) {
        console.error("Failed to load election details:", err);
        setError(err.message || "Failed to load election details.");
      } finally {
        setLoading(false);
      }
    };

    fetchElectionData();
  }, [id, nav]);

  const candidates = election?.candidates || [];
  
  const parties = useMemo(() => Array.from(new Set(candidates.map((c) => c.party_abbr))), [candidates]);
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const filtered = candidates.filter((c) => {
    const q = query.toLowerCase();
    const matchesQuery = !q || c.name.toLowerCase().includes(q) || c.party.toLowerCase().includes(q);
    const matchesParty = !partyFilter || c.party_abbr === partyFilter;
    const matchesLetter = !letterFilter || c.party_abbr.toUpperCase().startsWith(letterFilter) || c.party.toUpperCase().startsWith(letterFilter);
    return matchesQuery && matchesParty && matchesLetter;
  });

  const confirmVote = async () => {
    if (!selected || !election) return;
    setError(null);
    setCasting(true);

    try {
      const res = await apiRequest("/vote/", "POST", {
        election_id: id,
        candidate_id: selected,
      });
      setReceipt(res.receipt);
      setAlreadyVoted(true);
      setReviewing(false);
    } catch (err: any) {
      setError(err.message || "Failed to cast vote. Please try again.");
      setReviewing(false);
    } finally {
      setCasting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto max-w-5xl px-4 py-16 text-center animate-pulse">
          <p className="text-muted-foreground">Loading ballot details...</p>
        </div>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <p className="text-muted-foreground">Election not found or server unavailable.</p>
          <Link to="/dashboard" className="mt-4 inline-block font-semibold text-brand hover:underline">Back to elections</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-brand">
          <ArrowLeft className="h-4 w-4" /> All elections
        </Link>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand">{election.date}</p>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{election.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Review each candidate, then confirm your choice on the review screen.</p>
          </div>
          {alreadyVoted && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-sm font-semibold text-success">
              <CheckCircle2 className="h-4 w-4" /> Ballot already cast
            </span>
          )}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-6 items-start">
          {/* Alphabet Filter Sidebar */}
          <div className="flex flex-row sm:flex-col flex-wrap gap-1.5 shrink-0 justify-start">
            <FilterChip active={!letterFilter} onClick={() => setLetterFilter(null)}>All</FilterChip>
            {ALPHABET.map((letter) => (
              <FilterChip key={letter} active={letterFilter === letter} onClick={() => setLetterFilter(letter)}>
                {letter}
              </FilterChip>
            ))}
          </div>

          <div className="flex-1 min-w-0">
            {/* Filters */}
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder="Search candidate or party…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
                />
              </div>
            </div>

            {/* Candidates */}
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {filtered.map((c) => {
                const active = selected === c.id;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        if (!alreadyVoted) {
                          setSelected(c.id);
                          setReviewing(true); // Trigger modal immediately
                        }
                      }}
                      disabled={alreadyVoted}
                      aria-pressed={active}
                      className={`h-full w-full rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-brand bg-primary-soft/50 shadow-md"
                          : "border-border bg-card hover:border-brand/50 hover:shadow-sm"
                      } ${alreadyVoted && !active ? "opacity-40" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        {c.party_logo ? (
                          <img
                            src={c.party_logo}
                            alt={`${c.party_abbr} logo`}
                            className="h-14 w-14 shrink-0 rounded-xl object-contain shadow-sm bg-white p-1"
                          />
                        ) : (
                          <span
                            className="grid h-14 w-14 shrink-0 place-items-center rounded-xl font-display text-lg font-bold text-white shadow-sm"
                            style={{ background: c.color }}
                            aria-hidden
                          >
                            {c.party_abbr}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-display text-lg font-bold">{c.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{c.party}</p>
                            </div>
                            <span
                              className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                                active ? "border-brand bg-brand text-white" : "border-border"
                              }`}
                            >
                              {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                            </span>
                          </div>
                          {c.running_mate && (
                            <p className="mt-1 text-xs text-muted-foreground">Running mate: {c.running_mate}</p>
                          )}
                          <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{c.manifesto}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {filtered.length === 0 && (
              <p className="mt-8 text-center text-sm text-muted-foreground">No candidates match your filters.</p>
            )}
          </div>
        </div>
      </main>

      {/* Review modal */}
      {reviewing && selected && (
        <Modal onClose={() => setReviewing(false)} title="Review your ballot">
          <p className="text-sm text-muted-foreground">
            Please confirm. Once submitted, your ballot is committed and cannot be changed.
          </p>
          {(() => {
            const c = candidates.find((x) => x.id === selected)!;
            return (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
                {c.party_logo ? (
                  <img
                    src={c.party_logo}
                    alt={`${c.party_abbr} logo`}
                    className="h-12 w-12 shrink-0 rounded-lg object-contain bg-white p-0.5"
                  />
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-lg font-display font-bold text-white" style={{ background: c.color }}>
                    {c.party_abbr}
                  </span>
                )}
                <div>
                  <p className="font-display text-lg font-bold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.party}</p>
                </div>
              </div>
            );
          })()}
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary-soft/40 px-3 py-2 text-xs text-brand-dark">
            <ShieldCheck className="h-4 w-4" />
            Your NIN is not linked to this ballot. Voter anonymity is preserved.
          </div>
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setReviewing(false)}
              disabled={casting}
              className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              Go back
            </button>
            <button
              onDoubleClick={confirmVote}
              onClick={confirmVote}
              disabled={casting}
              className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              {casting ? "Casting Ballot..." : "Confirm & Cast"}
            </button>
          </div>
        </Modal>
      )}

      {/* Success modal */}
      {receipt && (
        <Modal onClose={() => nav({ to: "/dashboard" })} title={null}>
          <div className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold">Vote Cast Successfully</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your ballot has been securely recorded. Save your receipt token as proof of participation.
            </p>
            <div className="mt-4 rounded-lg border border-dashed border-brand/50 bg-primary-soft/40 px-4 py-3 font-mono text-sm tracking-wider text-brand-dark">
              {receipt}
            </div>
            <div className="mt-6 flex gap-2">
              <Link
                to="/dashboard"
                className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                Back to elections
              </Link>
              <Link
                to="/results"
                className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                See live results
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-brand text-white" : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Modal({ title, children, onClose }: { title: string | null; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          {title ? <h3 className="font-display text-xl font-bold">{title}</h3> : <span />}
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

