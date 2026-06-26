import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

/**
 * Wrap any protected page's component with this. Shows a spinner while the
 * session is being verified, then either renders the page or redirects to
 * /login if there's no authenticated user.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isInitializing, isAuthenticated, navigate]);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--gold-bright)]" />
          <span className="text-xs uppercase tracking-widest">Checking your session…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect is in-flight via the effect above; render nothing in the meantime.
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--gold-bright)]" />
          <span className="text-xs uppercase tracking-widest">Redirecting to login…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
