import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Fingerprint,
  ScanFace,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  Radio,
  UserCheck,
  Gavel,
  BarChart3,
  Award,
  Building2,
  Users,
  Eye,
  Newspaper,
  Lock,
} from "lucide-react";

import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RemoteVote NG | The Future of Nigerian Democracy" },
      {
        name: "description",
        content:
          "Secure, inclusive, and transparent remote voting for Nigeria. NIMC-backed identity verification, real-time collation, and an immutable audit trail for every ballot cast.",
      },
    ],
  }),
  component: LandingPage,
});

/* ---------------------------------------------------------------- */
/*  Scroll-reveal utility                                            */
/* ---------------------------------------------------------------- */

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, inView };
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Content                                                           */
/* ---------------------------------------------------------------- */

const HOW_IT_WORKS = [
  { step: "01", title: "Register with your NIN", desc: "Cross-checked against NIMC in seconds. No paperwork, no queue." },
  { step: "02", title: "Verify your identity", desc: "A one-time code, then an on-device facial match against your NIMC photo." },
  { step: "03", title: "Cast your ballot", desc: "Encrypted the instant it's sealed. You get a receipt code, not a copy of your choice." },
  { step: "04", title: "Watch it count", desc: "Collation updates live, from polling unit to national total." },
];

const LEDGER_LINES = [
  { time: "16:32:04", text: "NIN \u2022\u2022\u2022\u20223287 matched against NIMC record" },
  { time: "16:32:05", text: "One-time code confirmed" },
  { time: "16:32:07", text: "Facial match confirmed on-device" },
  { time: "16:32:09", text: "Ballot encrypted (AES-256) and sealed" },
  { time: "16:32:10", text: "Entry #48213 appended to audit ledger" },
];

const ROLES = [
  { icon: UserCheck, title: "Voter", desc: "Registers, verifies, and votes from any device." },
  { icon: Gavel, title: "Presiding Officer", desc: "Manages accreditation and submits result sheets at the polling unit." },
  { icon: BarChart3, title: "Collation Officer", desc: "Aggregates polling unit results into ward and LGA totals." },
  { icon: Award, title: "Returning Officer", desc: "Confirms and declares final results for their constituency." },
  { icon: Building2, title: "Commissioner", desc: "Creates elections, manages candidates, onboards field staff." },
  { icon: ShieldCheck, title: "INEC Secretary", desc: "System-wide oversight, metrics, and audit controls." },
  { icon: Users, title: "Polling Agent", desc: "Represents a party on the ground and flags discrepancies." },
  { icon: Eye, title: "Accredited Observer", desc: "Monitors the election live and files independent reports." },
  { icon: Newspaper, title: "Media / Press", desc: "Accesses verified, real-time result feeds for reporting." },
  { icon: Radio, title: "Security Auditor", desc: "Reviews the CRUD audit trail across every role and action." },
];

const FAQS = [
  {
    q: "How does RemoteVote NG confirm I am who I say I am?",
    a: "Registration checks your NIN against NIMC's records. Before you can vote, you confirm a one-time code and complete a facial match against your NIMC photo, both checked server-side. Your device never has the final say on whether you're verified.",
  },
  {
    q: "Can anyone see how I voted?",
    a: "No. Your ballot is encrypted before it leaves your device and only ever counted in aggregate. Your receipt code confirms your vote was recorded, it doesn't reveal your choice.",
  },
  {
    q: "What stops someone from voting twice?",
    a: "Each credential is tied to a single NIN and a single active session per election. Once a ballot is cast, that voter's status flips to 'has voted' at the database level. Repeat attempts are blocked and logged.",
  },
  {
    q: "What happens if my connection drops mid-vote?",
    a: "A ballot is only recorded once the server confirms it. A dropped connection before submission just means reconnecting and trying again, no partial or duplicate votes are possible.",
  },
];

/* ---------------------------------------------------------------- */
/*  Signature element: the ballot receipt                            */
/* ---------------------------------------------------------------- */

const RECEIPT_CODE = "RVNG-7K2M-9XQP-4B8R";
const BAR_WIDTHS = [3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1];

function BallotReceipt() {
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);
  const [stamped, setStamped] = useState(false);
  const [typingStarted, setTypingStarted] = useState(false);
  const [typed, setTyped] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setCheck1(true), 400),
      window.setTimeout(() => setCheck2(true), 850),
      window.setTimeout(() => setCheck3(true), 1300),
      window.setTimeout(() => setStamped(true), 1350),
      window.setTimeout(() => setTypingStarted(true), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!typingStarted) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTyped(RECEIPT_CODE.slice(0, i));
      if (i >= RECEIPT_CODE.length) clearInterval(id);
    }, 45);
    return () => clearInterval(id);
  }, [typingStarted]);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now
    ? now.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    : "--:--:--";
  const dateStr = now
    ? now.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })
    : "-- --- ----";

  const Row = ({ label, done }: { label: string; done: boolean }) => (
    <div
      className={`flex items-center justify-between py-2 transition-all duration-500 motion-reduce:transition-none ${
        done ? "opacity-100 translate-x-0" : "opacity-30 -translate-x-1"
      }`}
    >
      <span className="text-[13px] text-foreground/80">{label}</span>
      <span className={`font-mono text-[12px] font-bold ${done ? "text-brand" : "text-muted-foreground"}`}>
        {done ? "CONFIRMED" : "PENDING"}
      </span>
    </div>
  );

  return (
    <div className="relative">
      <div
        className={`absolute -right-3 top-16 sm:-right-4 sm:top-20 z-10 pointer-events-none select-none transition-all duration-700 motion-reduce:transition-none ${
          stamped ? "opacity-90 scale-100 rotate-[-10deg]" : "opacity-0 scale-150 rotate-[-25deg]"
        }`}
      >
        <div className="h-[72px] w-[72px] sm:h-20 sm:w-20 rounded-full border-[3px] border-[oklch(0.52_0.19_29)] grid place-items-center bg-background/70 backdrop-blur-sm">
          <span className="font-display text-[10px] sm:text-[11px] font-black tracking-widest text-[oklch(0.52_0.19_29)] text-center leading-tight">
            SEALED
            <br />
            &#10003;
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dashed border-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand" />
            <span className="font-display text-[12px] font-bold uppercase tracking-wider">Official Ballot Receipt</span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">{dateStr}</span>
        </div>

        <div className="px-6 py-4 divide-y divide-border/60">
          <Row label="Voter identity verified" done={check1} />
          <Row label="Biometric match confirmed" done={check2} />
          <Row label="Ballot encrypted &amp; sealed" done={check3} />
        </div>

        <div className="px-6 py-5 border-t-2 border-dashed border-border bg-surface/60">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Your receipt code</p>
          <p className="font-mono text-[18px] sm:text-[20px] font-bold tracking-wider text-brand-dark min-h-[26px]">
            {typed}
            <span className="inline-block w-[2px] h-[16px] bg-brand-dark ml-0.5 align-middle motion-safe:animate-pulse" />
          </p>

          <div className="flex items-end gap-[3px] mt-4 h-8">
            {BAR_WIDTHS.map((w, i) => (
              <span key={i} className="bg-foreground/70" style={{ width: 2, height: `${w * 6}px` }} />
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground mt-3 italic">
            This code confirms your vote was recorded. It does not reveal your choice. &middot; {timeStr} WAT
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Ledger panel                                                     */
/* ---------------------------------------------------------------- */

function LedgerPanel() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (visibleCount >= LEDGER_LINES.length) return;
    const id = setTimeout(() => setVisibleCount((c) => c + 1), 450);
    return () => clearTimeout(id);
  }, [inView, visibleCount]);

  return (
    <div ref={ref} className="rounded-xl border border-border bg-card p-6 font-mono text-[12.5px] leading-8">
      {LEDGER_LINES.map((line, i) => (
        <div
          key={i}
          className={`flex gap-3 transition-all duration-400 motion-reduce:transition-none ${
            i < visibleCount ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
          }`}
        >
          <span className="text-muted-foreground shrink-0">[{line.time}]</span>
          <span className="text-foreground/80">{line.text}</span>
          {i < visibleCount && <span className="text-brand font-bold">&#10003;</span>}
        </div>
      ))}
      {visibleCount >= LEDGER_LINES.length && (
        <span className="inline-block w-[7px] h-[14px] bg-brand ml-[3.15rem] mt-1 motion-safe:animate-pulse" />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Page                                                              */
/* ---------------------------------------------------------------- */

function LandingPage() {
  const [heroReady, setHeroReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setHeroReady(true), 30);
    return () => clearTimeout(id);
  }, []);

  const stagger = (i: number) => (heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-brand/20">
      <AppHeader />

      <main className="flex-1">
        {/* ============ HERO ============ */}
        <section className="relative overflow-hidden py-14 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
              <div>
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand/25 text-brand font-mono text-[10px] uppercase tracking-widest mb-7 transition-all duration-500 motion-reduce:transition-none ${stagger(0)}`}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75 motion-reduce:animate-none" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand" />
                  </span>
                  2027 Elections &middot; Registration Open
                </div>

                <h1
                  className={`text-[38px] sm:text-[46px] md:text-[54px] font-extrabold tracking-tight leading-[1.08] mb-5 transition-all duration-500 delay-100 motion-reduce:transition-none ${stagger(1)}`}
                >
                  The future of{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-emerald-500">
                    Nigerian democracy
                  </span>
                </h1>

                <p
                  className={`text-[16px] md:text-[17px] text-muted-foreground mb-9 max-w-lg leading-relaxed transition-all duration-500 delay-200 motion-reduce:transition-none ${stagger(2)}`}
                >
                  Secure, inclusive, remote voting. Every eligible Nigerian can cast a ballot from anywhere,
                  and prove it was counted, without ever revealing who they voted for.
                </p>

                <div
                  className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all duration-500 delay-300 motion-reduce:transition-none ${stagger(3)}`}
                >
                  <Link
                    to="/login"
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-[8px] bg-brand px-[28px] py-[14px] text-[15px] font-semibold text-white shadow-sm transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  >
                    <Fingerprint className="h-4.5 w-4.5" />
                    Sign in to vote
                  </Link>
                  <Link
                    to="/signup"
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-[8px] border border-border px-[28px] py-[14px] text-[15px] font-semibold text-foreground transition hover:border-brand/40 hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  >
                    Create voter account
                    <ArrowRight className="h-4 w-4 text-brand" />
                  </Link>
                </div>

                <p
                  className={`text-[12px] text-muted-foreground/70 mt-8 transition-all duration-500 delay-500 motion-reduce:transition-none ${stagger(4)}`}
                >
                  94% of surveyed voters said they'd vote remotely, RemoteVote NG voter research, 49 respondents.
                </p>
              </div>

              <div
                className={`transition-all duration-700 delay-200 motion-reduce:transition-none ${
                  heroReady ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"
                }`}
              >
                <BallotReceipt />
              </div>
            </div>
          </div>
        </section>

        {/* ============ HOW IT WORKS ============ */}
        <Reveal>
          <section className="py-16 md:py-20 border-y border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand mb-8">How it works</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border border-t border-border">
                {HOW_IT_WORKS.map((s, i) => (
                  <div
                    key={i}
                    className={`py-7 lg:px-7 lg:first:pl-0 lg:last:pr-0 border-border ${
                      i < HOW_IT_WORKS.length - 1 ? "border-b lg:border-b-0" : ""
                    }`}
                  >
                    <span className="font-mono text-[13px] font-bold text-brand">{s.step}</span>
                    <h3 className="font-display font-bold text-[16px] mt-2 mb-2">{s.title}</h3>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* ============ WHAT HAPPENS WHEN YOU SUBMIT ============ */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <Reveal>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand mb-4">Under the hood</p>
                  <h2 className="font-display text-[28px] md:text-[34px] font-bold mb-4 leading-tight">
                    What happens the moment you press submit
                  </h2>
                  <p className="text-muted-foreground text-[15px] leading-relaxed mb-6 max-w-md">
                    Every action, from identity check to ballot encryption, is written to an audit ledger
                    that can't be edited after the fact. This is a real sequence from a real submission.
                  </p>
                  <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 text-brand" />
                    Reviewable by accredited security auditors at any time.
                  </div>
                </div>
              </Reveal>
              <Reveal delay={150}>
                <LedgerPanel />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ============ ROLES ============ */}
        <Reveal>
          <section className="py-16 md:py-20 border-y border-border bg-surface/50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand mb-8">Who's on the platform</p>

              <div className="divide-y divide-border border-y border-border">
                {ROLES.map((r, i) => (
                  <div key={i} className="flex items-start sm:items-center gap-4 py-4">
                    <r.icon className="h-4 w-4 text-brand shrink-0 mt-0.5 sm:mt-0" />
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-baseline sm:gap-4">
                      <span className="font-display font-bold text-[14px] sm:w-44 shrink-0">{r.title}</span>
                      <span className="text-[13px] text-muted-foreground">{r.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* ============ LIVE RESULTS ============ */}
        <section className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand mb-4">Radical transparency</p>
                  <h2 className="font-display text-[26px] md:text-[32px] font-bold leading-tight max-w-md">
                    Results the public sees at the same moment officials do
                  </h2>
                </div>
                <Link
                  to="/results"
                  className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-brand hover:underline shrink-0"
                >
                  View live results
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Radio className="h-3.5 w-3.5 text-brand" />
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Presidential Election &middot; Sample
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" /> Updating
                  </span>
                </div>
                <div className="space-y-4">
                  {[
                    { name: "Green Alliance Party", pct: 32, color: "bg-emerald-500" },
                    { name: "Unity Progressive Movement", pct: 29, color: "bg-blue-500" },
                    { name: "People's Reform Congress", pct: 22, color: "bg-red-500" },
                    { name: "New Dawn Coalition", pct: 17, color: "bg-purple-500" },
                  ].map((p, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between text-[12.5px] mb-1.5">
                        <span className="font-medium">{p.name}</span>
                        <span className="font-mono font-bold text-foreground">{p.pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${p.color}`} style={{ width: `${p.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-6 pt-4 border-t border-border">
                  Sample data for illustration. Live figures appear once polling opens.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <Reveal>
          <section className="py-16 md:py-20 border-t border-border">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand mb-8">Before you register</p>

              <div>
                {FAQS.map((f, i) => (
                  <details key={i} className="group border-b border-border py-5 first:border-t">
                    <summary className="flex items-start gap-4 cursor-pointer list-none focus-visible:outline-none">
                      <span className="font-mono text-[12px] text-brand font-bold pt-0.5 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 font-semibold text-[15px]">{f.q}</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180 shrink-0 mt-1" />
                    </summary>
                    <p className="mt-3 ml-8 text-[13.5px] text-muted-foreground leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* ============ FINAL CTA ============ */}
        <Reveal>
          <section className="py-16 md:py-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="rounded-2xl border-2 border-brand-dark/80 bg-primary-soft/40 px-6 py-14 md:px-16 md:py-16 text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-dark mb-4">Registration open</p>
                <h2 className="font-display text-[26px] md:text-[36px] font-bold mb-3 max-w-lg mx-auto leading-tight">
                  Four minutes to register. A lifetime of having voted.
                </h2>
                <p className="text-muted-foreground text-[14px] md:text-[15px] max-w-sm mx-auto mb-9">
                  Bring your NIN. RemoteVote NG handles the rest.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    to="/signup"
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-[8px] bg-brand px-[28px] py-[14px] text-[15px] font-semibold text-white shadow-sm transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  >
                    Register to vote
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/accreditation"
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-[8px] border border-brand-dark/30 px-[28px] py-[14px] text-[15px] font-semibold text-brand-dark transition hover:bg-brand-dark/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  >
                    Apply for accreditation
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </Reveal>
      </main>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="font-display font-bold text-[14px] text-muted-foreground">RemoteVote NG</span>
          </div>
          <p className="text-[12.5px] text-muted-foreground">&copy; 2026 RemoteVote NG Systems. All rights reserved.</p>
          <div className="flex gap-5">
            <Link to="/login" className="text-[12.5px] text-muted-foreground hover:text-foreground">Staff portal</Link>
            <Link to="/results" className="text-[12.5px] text-muted-foreground hover:text-foreground">Transparency</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}