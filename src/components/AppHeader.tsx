import { Link, useRouterState } from "@tanstack/react-router";
import Logo from "@/assets/logo.svg";

export function AppHeader() {
  return (
      <header className="border-b border-border/60 bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={Logo} alt="Brand Logo" />
            <span className="font-display font-bold">RemoteVote <span className="text-brand">NG</span></span>
          </Link>
          <span className="hidden text-xs text-muted-foreground sm:inline">Secure. Inclusive. Transparent.</span>
        </div>
      </header>
  );
}
