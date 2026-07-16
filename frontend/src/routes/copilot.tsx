import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Sparkles, User, Loader2, MessageSquare, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { StudioLayout, PageHeader, GlassCard } from "@/components/dashboard/StudioLayout";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/copilot")({
  head: () => ({ meta: [{ title: "AI Copilot — Studio" }] }),
  component: CopilotPage,
});

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  timestamp: Date;
}

const STARTER_SUGGESTIONS = [
  "How can I improve the pacing of my screenplay?",
  "Suggest camera angles for an intense dialogue scene",
  "Help me reduce my production budget",
  "Rewrite this dialogue to sound more natural",
  "What makes a compelling opening scene?",
  "Suggest a plot twist for a thriller",
];

function CopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const mutation = useMutation({
    mutationFn: (message: string) => api.studio.copilot({ message }),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message,
          suggestions: data.suggestions,
          timestamp: new Date(),
        },
      ]);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Copilot couldn't respond. Try again.";
      toast.error(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "I'm sorry, I couldn't process that request. Please try again.",
          timestamp: new Date(),
        },
      ]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, mutation.isPending]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: trimmed, timestamp: new Date() },
    ]);
    mutation.mutate(trimmed);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <StudioLayout>
      <PageHeader
        eyebrow="AI Assistant"
        title="AI Copilot"
        description="Your intelligent filmmaking assistant. Ask anything about scenes, dialogue, production, or creative direction."
        actions={
          <span className="flex items-center gap-2 rounded-full border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.08)] px-3 py-1.5 text-[10px] uppercase tracking-widest text-[var(--gold-bright)]">
            <Bot className="h-3 w-3" /> GPT-5.5
          </span>
        }
      />

      <div className="flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: "400px" }}>
        {/* Chat messages */}
        <GlassCard className="flex-1 !p-0 overflow-hidden flex flex-col">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="grid h-16 w-16 place-items-center rounded-2xl border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.06)]">
                  <Bot className="h-7 w-7 text-[var(--gold-bright)]" />
                </div>
                <h3 className="mt-4 font-display text-xl text-foreground">How can I help?</h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  I'm your AI filmmaking assistant. Ask me about scenes, dialogue, camera work, budgets, or any aspect of production.
                </p>
                <div className="mt-6 grid gap-2 sm:grid-cols-2 max-w-lg w-full">
                  {STARTER_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="group flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left text-xs text-muted-foreground transition hover:border-[oklch(0.85_0.155_86/0.3)] hover:bg-[oklch(0.85_0.155_86/0.05)] hover:text-foreground"
                    >
                      <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--gold-dim)] group-hover:text-[var(--gold-bright)]" />
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.08)]">
                        <Bot className="h-4 w-4 text-[var(--gold-bright)]" />
                      </div>
                    )}
                    <div className={`max-w-[75%] min-w-0 ${msg.role === "user" ? "order-first" : ""}`}>
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] text-black"
                            : "border border-white/10 bg-white/[0.03] text-foreground"
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                      </div>
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {msg.suggestions.map((s) => (
                            <button
                              key={s}
                              onClick={() => send(s)}
                              className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[11px] text-muted-foreground transition hover:border-[oklch(0.85_0.155_86/0.3)] hover:text-[var(--gold-bright)]"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03]">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}
                {mutation.isPending && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.08)]">
                      <Bot className="h-4 w-4 text-[var(--gold-bright)]" />
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--gold-bright)]" />
                      Thinking...
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-white/10 p-3 sm:p-4">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask anything about your production..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[oklch(0.85_0.155_86/0.45)] focus:outline-none"
                style={{ maxHeight: "120px" }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || mutation.isPending}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] text-black shadow-[0_0_24px_-6px_var(--gold-bright)] transition hover:shadow-[0_0_32px_-2px_var(--gold-bright)] disabled:opacity-40 disabled:shadow-none"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </GlassCard>
      </div>
    </StudioLayout>
  );
}
