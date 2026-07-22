import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { formatNumber } from "@/lib/mock-store";
import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Users } from "lucide-react";
import { apiRequest, Election } from "@/lib/api";

export const Route = createFileRoute("/results")({
  head: () => ({ meta: [{ title: "Live Results — RemoteVote NG" }] }),
  component: ResultsPage,
});

const LGAS = [
  { name: "Ikeja", cast: 32_455 },
  { name: "Surulere", cast: 28_120 },
  { name: "Alimosho", cast: 41_902 },
  { name: "Eti-Osa", cast: 19_884 },
  { name: "Yaba", cast: 15_733 },
];

function ResultsPage() {
  const [electionId, setElectionId] = useState("presidential-2027");
  const [election, setElection] = useState<Election | null>(null);
  const [allElections, setAllElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [simulatedVotes, setSimulatedVotes] = useState<Record<string, number>>({});

  // Reset simulation when changing election
  useEffect(() => {
    setSimulatedVotes({});
    setElection(null);
    setLoading(true);
  }, [electionId]);

  // Initial fetch to get election details & has_voted status
  useEffect(() => {
    let active = true;
    const fetchResults = async () => {
      try {
        const [electionData, allData] = await Promise.all([
          apiRequest<Election>(`/elections/${electionId}/`),
          apiRequest<Election[]>('/elections/')
        ]);
        
        if (!active) return;
        setElection(electionData);
        setAllElections(allData);
        setError(null);

        // Initialize simulation only if they have voted (or if we want to simulate anyway behind the scenes)
        setSimulatedVotes((prev) => {
          if (Object.keys(prev).length > 0) return prev;
          const newSim: Record<string, number> = {};
          // Give a huge random baseline for a "live national" feel
          electionData.candidates.forEach((c) => {
            const base = Math.floor(Math.random() * 4000000) + 1000000;
            newSim[c.id] = base + c.votes_count;
          });
          return newSim;
        });
      } catch (err: any) {
        if (!active) return;
        console.error("Failed to fetch election:", err);
        setError("Could not load election data from server.");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchResults();

    // Heavy frontend simulation loop! Update numbers locally every 1.5 seconds
    const interval = setInterval(() => {
      setSimulatedVotes((prev) => {
        if (Object.keys(prev).length === 0) return prev;
        const updated = { ...prev };
        Object.keys(updated).forEach((id) => {
          // Add random burst of votes (100 to 500)
          updated[id] += Math.floor(Math.random() * 400) + 100;
        });
        return updated;
      });
      setTick((t) => t + 1);
    }, 1500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [electionId]);

  const results = useMemo(() => {
    if (!election) return [];
    return election.candidates
      .map((c) => ({
        candidateId: c.id,
        votes: simulatedVotes[c.id] || c.votes_count,
        candidateObj: c,
      }))
      .sort((a, b) => b.votes - a.votes);
  }, [election, simulatedVotes]);

  const total = results.reduce((s, r) => s + r.votes, 0);
  const leader = results[0];
  const leaderCandidate = leader?.candidateObj;
  const leaderPct = leader && total ? (leader.votes / total) * 100 : 0;

  // Render blocked state if user has NOT voted for all active elections
  const activeElections = allElections.filter(e => e.status === "active");
  const allActiveVoted = activeElections.length > 0 ? activeElections.every(e => e.has_voted) : true;
  const isBlocked = allElections.length > 0 && !allActiveVoted;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand">Live Feed</p>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Current Results</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Updating securely · totals aggregated nationwide
            </p>
          </div>
          <select
            value={electionId}
            onChange={(e) => setElectionId(e.target.value)}
            className="rounded-lg border border-input bg-card px-3 py-2 text-sm font-medium shadow-sm"
          >
            {allElections.length > 0 ? (
              allElections.map(e => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))
            ) : (
              <>
                <option value="presidential-2027">Presidential Election</option>
                <option value="senate-2027">National Assembly — Senate</option>
                <option value="house-reps-2027">House of Representatives</option>
                <option value="governorship-lagos-2027">Lagos Governorship</option>
              </>
            )}
          </select>
        </div>

        {error && (
          <div className="mt-6 rounded-lg bg-destructive/10 p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {loading && !election ? (
          <div className="mt-8 text-center text-muted-foreground animate-pulse">
            Loading live result feed...
          </div>
        ) : isBlocked ? (
          <div className="mt-12 rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Users className="h-8 w-8" />
            </div>
            <h2 className="mt-6 font-display text-2xl font-bold">Results Locked</h2>
            <p className="mt-2 text-muted-foreground max-w-md mx-auto">
              You must cast your ballot for <strong>all active elections</strong> before you can view the live aggregated results.
            </p>
            <div className="mt-8">
              <Link to="/dashboard" className="rounded-lg bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark">
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Stat tiles */}
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {results.slice(0, 4).map((r) => {
                const c = r.candidateObj;
                const pct = total ? ((r.votes / total) * 100).toFixed(1) : "0.0";
                return (
                  <div key={r.candidateId} className="rounded-xl border border-border bg-card p-4 shadow-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[100%] group-hover:animate-[shimmer_1.5s_infinite]" />
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c?.color ?? "#888" }} />
                      <p className="text-xs font-semibold text-muted-foreground">{c?.party_abbr ?? "—"}</p>
                    </div>
                    <p className="mt-1 font-display text-2xl font-bold tabular-nums transition-all duration-300">{formatNumber(r.votes)}</p>
                    <p className="text-xs text-muted-foreground">{pct}% of total</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              {/* Leader donut */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-1">
                <h2 className="font-display text-lg font-bold">Leading Candidate</h2>
                <div className="mt-6 grid place-items-center">
                  <Donut percent={leaderPct} color={leaderCandidate?.color ?? "#2e7d32"} label={`${leaderPct.toFixed(1)}%`} />
                </div>
                {leaderCandidate && (
                  <div className="mt-4 text-center animate-in fade-in duration-500">
                    <p className="font-display text-lg font-bold">{leaderCandidate.name}</p>
                    <p className="text-xs text-muted-foreground">{leaderCandidate.party}</p>
                    <p className="mt-2 text-sm text-brand-dark font-medium">
                      {formatNumber(leader.votes)} votes · leading by{" "}
                      {formatNumber(Math.max(0, leader.votes - (results[1]?.votes ?? 0)))}
                    </p>
                  </div>
                )}
              </section>

              {/* Breakdown */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">Candidate Breakdown</h2>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                    </span>
                    Live Simulation
                  </span>
                </div>
                <ul className="mt-4 space-y-3">
                  {results.map((r) => {
                    const c = r.candidateObj;
                    const pct = total ? (r.votes / total) * 100 : 0;
                    return (
                      <li key={r.candidateId}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 font-medium">
                            <span className="grid h-7 w-7 place-items-center rounded-md text-[10px] font-bold text-white shadow-sm" style={{ background: c?.color }}>
                              {c?.party_abbr}
                            </span>
                            {c?.name}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            <span className="text-foreground transition-all duration-300">{formatNumber(r.votes)}</span> · <span className="font-semibold text-foreground">{pct.toFixed(1)}%</span>
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                          <div
                            className="h-full rounded-full transition-all duration-[1500ms] ease-out"
                            style={{ width: `${pct}%`, background: c?.color }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          </>
        )}

        {/* LGA Snapshots */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Local Government Turnout</h2>
              <p className="text-sm text-muted-foreground">Ballots cast per LGA · Lagos State snapshot</p>
            </div>
            <span className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:inline-flex">
              <TrendingUp className="h-4 w-4 text-brand" /> Turnout trending up 3.2%
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {LGAS.map((l) => (
              <div key={l.name} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-primary-soft text-brand-dark">
                    <Users className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{l.name}</p>
                    <p className="text-xs text-muted-foreground">Lagos State</p>
                  </div>
                </div>
                <p className="font-display text-lg font-bold tabular-nums">{formatNumber(l.cast + (tick % 5) * 12)}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
            <p className="text-muted-foreground">
              Total ballots cast: <span className="font-display text-lg font-bold text-foreground">{formatNumber(total)}</span>
            </p>
            <Link to="/dashboard" className="font-semibold text-brand hover:underline">Back to elections →</Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function Donut({ percent, color, label }: { percent: number; color: string; label: string }) {
  const r = 60;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div className="relative">
      <svg width={160} height={160} viewBox="0 0 160 160" className="-rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--muted)" strokeWidth="14" />
        <circle
          cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="font-display text-2xl font-bold tabular-nums">{label}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Leading</p>
        </div>
      </div>
    </div>
  );
}

