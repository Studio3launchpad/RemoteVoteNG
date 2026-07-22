import { Link, useRouterState } from "@tanstack/react-router";
import Logo from "@/assets/logo.svg";
import { useEffect, useState } from "react";
import { getSession, setSession } from "@/lib/mock-store";
import { LogOut, User } from "lucide-react";


export function AppHeader() {
   const pathname = useRouterState({ select: (s) => s.location.pathname });
   const [name, setName] = useState<string | null>(null);

   useEffect(() => {
     setName(getSession()?.fullName ?? null);
   }, [pathname]);

   const nav = [
     { to: "/dashboard", label: "Elections" },
     { to: "/results", label: "Live Results" },
   ];

  return (
      <header className="border-b border-border/60 bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={Logo} alt="Brand Logo" />
            <span className="font-display font-bold text-[16px] md:text-[18px]">RemoteVote <span className="text-brand">NG</span></span>
          </Link>



       <div className="flex items-center gap-2">
         {name ? (
           <>
             <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 sm
:flex">
               <span className="grid h-6 w-6 place-items-center rounded-full bg-primary-soft text-brand-dark"> 
                 <User className="h-3.5 w-3.5" />
               </span>
               <span className="text-sm font-medium">{name}</span>
             </div>
             
             <nav className="hidden items-center gap-1 md:flex">
               {nav.map((n) => {
                 const active = pathname === n.to;
                 return (
                   <Link
                     key={n.to}
                     to={n.to}
                     className={`rounded-lg px-3 py-1.5 text-[13px] md:text-[14px] font-medium transition-colors ${
                       active ? "bg-primary-soft text-brand-dark" : "text-muted-foreground hover:text-foreground"    
                     }`}
                   >
                     {n.label}
                   </Link>
                 );
               })}
             </nav>

             <button
               onClick={() => {
                 setSession(null);
                 try {
                   localStorage.removeItem('rvng.token');
                 } catch (e) {}
                 window.location.href = "/";
               }}
               className="inline-flex items-center gap-1.5 rounded-[8px] border border-border bg-card px-3 py-1.5 
text-sm font-medium hover:bg-muted"
               aria-label="Sign out"
             >
               <LogOut className="h-4 w-4" />
               <span className="hidden sm:inline text-[14px]">Sign out</span>
             </button>
           </>
         ) : (
           <span className="hidden text-xs text-muted-foreground sm:inline">Secure. Inclusive. Transparent.</span>
         )}

        </div>
      </div>
    </header>
  );
}
