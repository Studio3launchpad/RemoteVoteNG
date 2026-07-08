import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import authHero from "@/assets/auth-hero.jpg";
import {AppHeader} from "@/components/AppHeader"

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* Simple top bar */}
      <AppHeader />

      <main className="mx-auto grid max-w-6xl h-screen gap-6 px-4 py-6 sm:px-6 md:grid-cols-2 md:py-10">
        {/* Form card */}
        <section className="flex items-center">
          <div className="w-full border border-border bg-card p-6 shadow-sm sm:p-8">
            <h1 className="mt-1 font-display text-[49px] lg:text-[55px] font-bold tracking-tight">
              {title}
            </h1>
            <div className="mt-[32px]">{children}</div>
            {footer && (
              <div className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
                {footer}
              </div>
            )}
          </div>
        </section>

        {/* Hero panel */}
        <aside className="relative hidden overflow-hidden bg-brand-dark md:block">
          <img
            src={authHero}
            alt="Nigerian voters holding a VOTE placard, campaign poster reading Your Voice, Your Power, Your Future"
            className="h-full w-full object-cover"
            width={896}
            height={1280}
          />
        </aside>
      </main>
    </div>
  );
}

export function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-[12.5px] block text-[16px] lg:text-[18px] font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-[16px] lg:text-[18px] text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/25";

export const primaryBtnClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-brand px-[32px] py-[16px] text-[16px] lg:text-[18px] font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60";
