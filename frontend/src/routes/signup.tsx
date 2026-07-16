import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Clapperboard, Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { ApiError, type PlanType } from "@/lib/api";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign Up — CineOS AI" },
      { name: "description", content: "Create your CineOS AI account." },
    ],
  }),
  component: Signup,
});

const planOptions: { value: PlanType; label: string }[] = [
  { value: "creator", label: "Creator" },
  { value: "professional", label: "Professional Director" },
  { value: "studio", label: "Studio" },
];

function Signup() {
  const { signup, isSubmitting, isAuthenticated, isInitializing } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [planType, setPlanType] = useState<PlanType>("creator");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      navigate({ to: "/" });
    }
  }, [isInitializing, isAuthenticated, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!name || !email || !password) {
      setFormError("Please fill in your name, email, and password.");
      return;
    }
    if (password.length < 6) {
      setFormError("Password should be at least 6 characters.");
      return;
    }

    try {
      await signup(name, email, password, planType);
      toast.success("Account created — welcome to the studio!");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Signup failed. Please try again.";
      setFormError(message);
      toast.error(message);
    }
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[18%] top-10 h-72 w-72 rounded-full bg-[oklch(0.85_0.155_86/0.10)] blur-[120px] animate-float-light" />
        <div className="absolute right-[8%] top-[40%] h-96 w-96 rounded-full bg-[oklch(0.78_0.135_84/0.08)] blur-[140px] animate-float-light" style={{ animationDelay: "2s" }} />
        <div className="cinema-sweep" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-vignette)" }} />
        <div className="cinema-grain" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
        className="relative w-full max-w-md rounded-2xl border border-[oklch(0.85_0.155_86/0.15)] bg-[#0d0d0d]/90 p-8 backdrop-blur-xl shadow-[var(--shadow-premium)]"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-xl border border-[oklch(0.85_0.155_86/0.35)] bg-gradient-to-br from-[#1a1408] to-black shadow-[0_0_24px_-6px_oklch(0.85_0.155_86/0.7)]">
            <Clapperboard className="h-7 w-7 text-[var(--gold-bright)]" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--gold-dim)]">
              CineOS
            </div>
            <h1 className="font-display text-2xl tracking-[0.18em] text-foreground">AI</h1>
          </div>
        </div>

        <h2 className="mt-8 font-display text-xl text-foreground">Create your account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Start turning scripts into productions.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-xs uppercase tracking-widest text-[var(--gold-dim)]"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jordan Director"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-[oklch(0.85_0.155_86/0.45)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.85_0.155_86/0.12)]"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs uppercase tracking-widest text-[var(--gold-dim)]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.com"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-[oklch(0.85_0.155_86/0.45)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.85_0.155_86/0.12)]"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs uppercase tracking-widest text-[var(--gold-dim)]"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 pr-11 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-[oklch(0.85_0.155_86/0.45)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.85_0.155_86/0.12)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-[var(--gold-dim)]">
              Plan
            </label>
            <div className="grid grid-cols-3 gap-2">
              {planOptions.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPlanType(p.value)}
                  className={`rounded-lg border px-2 py-2 text-[11px] font-medium transition ${
                    planType === p.value
                      ? "border-[oklch(0.85_0.155_86/0.5)] bg-[oklch(0.85_0.155_86/0.12)] text-[var(--gold-bright)]"
                      : "border-white/10 bg-black/30 text-muted-foreground hover:border-white/20 hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {formError && (
            <div className="rounded-lg border border-red-400/30 bg-red-400/5 px-4 py-2.5 text-sm text-red-300">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] px-5 py-2.5 text-sm font-semibold text-black shadow-[0_0_24px_-6px_var(--gold-bright)] transition hover:shadow-[0_0_36px_-2px_var(--gold-bright)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {isSubmitting ? "Creating account…" : "Sign Up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-[var(--gold-bright)] hover:underline">
            Log in
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
