import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clapperboard } from "lucide-react";

export function StartupAnimation({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("cineos_started");
  });

  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => {
      setShow(false);
      sessionStorage.setItem("cineos_started", "1");
    }, 2800);
    return () => clearTimeout(timer);
  }, [show]);

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            key="startup"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B0B0B]"
          >
            <div className="flex flex-col items-center gap-6">
              {/* Logo reveal */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
                className="grid h-20 w-20 place-items-center rounded-2xl border border-[oklch(0.85_0.155_86/0.35)] bg-gradient-to-br from-[#1a1408] to-black shadow-[0_0_60px_-10px_oklch(0.85_0.155_86/0.7)]"
              >
                <Clapperboard className="h-10 w-10 text-[var(--gold-bright)]" />
              </motion.div>

              {/* Brand text */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-center"
              >
                <div className="text-[11px] uppercase tracking-[0.4em] text-[var(--gold-dim)]">
                  CineOS
                </div>
                <div className="font-display text-4xl tracking-[0.25em] text-foreground">
                  AI
                </div>
              </motion.div>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                className="text-xs tracking-[0.2em] text-muted-foreground"
              >
                From Script to Production
              </motion.p>

              {/* Loading bar */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="h-0.5 w-48 overflow-hidden rounded-full bg-white/5"
              >
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 1.2, duration: 1.5, ease: "easeInOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] shadow-[0_0_8px_var(--gold-bright)]"
                />
              </motion.div>
            </div>

            {/* Ambient glow */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 1 }}
                className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[oklch(0.85_0.155_86/0.08)] blur-[100px]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
