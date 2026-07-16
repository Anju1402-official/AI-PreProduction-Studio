import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { GlassCard, GoldButton } from "@/components/dashboard/StudioLayout";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <GlassCard className="flex min-h-[280px] flex-col items-center justify-center text-center">
      <div className="w-full space-y-4">
        <div className="mx-auto h-3 w-48 rounded-full bg-white/5 animate-shimmer" />
        <div className="mx-auto h-3 w-64 rounded-full bg-white/5 animate-shimmer" style={{ animationDelay: "0.15s" }} />
        <div className="mx-auto h-3 w-40 rounded-full bg-white/5 animate-shimmer" style={{ animationDelay: "0.3s" }} />
      </div>
      <div className="mt-6 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--gold-bright)]" />
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
    </GlassCard>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <GlassCard className="flex min-h-[280px] flex-col items-center justify-center text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full border border-red-400/30 bg-red-400/5">
        <AlertTriangle className="h-5 w-5 text-red-300" />
      </div>
      <h3 className="mt-4 font-display text-lg text-foreground">Something went wrong</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <div className="mt-5">
          <GoldButton onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5" /> Try Again
          </GoldButton>
        </div>
      )}
    </GlassCard>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <GlassCard className="flex min-h-[280px] flex-col items-center justify-center text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.06)]">
        {icon ?? <Inbox className="h-6 w-6 text-[var(--gold-bright)]" />}
      </div>
      <h3 className="mt-4 font-display text-lg text-foreground">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </GlassCard>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <GlassCard className="animate-pulse">
      <div className="space-y-3">
        <div className="h-3 w-24 rounded-full bg-white/5" />
        <div className="h-8 w-32 rounded-full bg-white/5" />
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-2.5 rounded-full bg-white/5" style={{ width: `${70 + Math.random() * 30}%` }} />
        ))}
      </div>
    </GlassCard>
  );
}
