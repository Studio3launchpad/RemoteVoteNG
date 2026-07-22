import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout, primaryBtnClass } from "@/components/AuthLayout";
import { getSession, setSession } from "@/lib/mock-store";
import { Check } from "lucide-react";

export const Route = createFileRoute("/language")({
  head: () => ({ meta: [{ title: "Select Language — RemoteVote NG" }] }),
  component: LanguagePage,
});

const LANGS = [
  { code: "en", label: "English", native: "English" },
  { code: "ha", label: "Hausa", native: "Hausa" },
  { code: "yo", label: "Yoruba", native: "Yorùbá" },
  { code: "ig", label: "Igbo", native: "Igbo" },
  { code: "pcm", label: "Nigerian Pidgin", native: "Naija" },
  { code: "ff", label: "Fulfulde", native: "Fulfulde" },
];

function LanguagePage() {
  const nav = useNavigate();
  const [selected, setSelected] = useState("en");

  const submit = () => {
    const s = getSession();
    if (s) setSession({ ...s, language: LANGS.find((l) => l.code === selected)?.label ?? "English" });
    nav({ to: "/dashboard" });
  };

  return (
    <AuthLayout
      title="Select Preferred Language"
      subtitle="Choose the language you'd like the ballot, instructions, and voice guidance to appear in."
    >
      <div className="space-y-2">
        {LANGS.map((l) => {
          const active = l.code === selected;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setSelected(l.code)}
              className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                active
                  ? "border-brand bg-primary-soft/60"
                  : "border-border bg-card hover:border-brand/50 hover:bg-muted"
              }`}
            >
              <div>
                <p className="font-semibold text-foreground">{l.label}</p>
                <p className="text-xs text-muted-foreground">{l.native}</p>
              </div>
              <span
                className={`grid h-6 w-6 place-items-center rounded-full border-2 ${
                  active ? "border-brand bg-brand text-white" : "border-border"
                }`}
              >
                {active && <Check className="h-3.5 w-3.5" />}
              </span>
            </button>
          );
        })}
      </div>
      <button onClick={submit} className={`${primaryBtnClass} mt-6`}>Continue</button>
    </AuthLayout>
  );
}
