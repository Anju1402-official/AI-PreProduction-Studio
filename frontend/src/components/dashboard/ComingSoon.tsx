import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  StudioLayout,
  PageHeader,
  GlassCard,
  GoldButton,
} from "@/components/dashboard/StudioLayout";
import { Sparkles, Check } from "lucide-react";

export function ComingSoon({
  eyebrow,
  title,
  description,
  preview,
}: {
  eyebrow: string;
  title: string;
  description: string;
  preview?: ReactNode;
}) {
  const [joined, setJoined] = useState(false);

  return (
    <StudioLayout>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          <GoldButton
            onClick={() => {
              if (joined) return;
              setJoined(true);
              toast.success(`You're on the waitlist for ${title}.`, {
                description: "We'll email you the moment it's ready.",
              });
            }}
            className={joined ? "pointer-events-none opacity-80" : ""}
          >
            {joined ? (
              <>
                <Check className="h-3.5 w-3.5" /> On the Waitlist
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" /> Join Waitlist
              </>
            )}
          </GoldButton>
        }
      />
      <GlassCard className="min-h-[420px]">
        <div className="flex h-full min-h-[380px] flex-col items-center justify-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-[oklch(0.85_0.155_86/0.35)] bg-gradient-to-br from-[#1a1408] to-black shadow-[0_0_40px_-10px_var(--gold-bright)]">
            <Sparkles className="h-7 w-7 text-[var(--gold-bright)]" />
          </div>
          <h3 className="mt-5 font-display text-2xl text-foreground">In the cutting room</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            This generator is being color-graded by our team. The mock layout below shows the shape
            of things to come.
          </p>
          {preview && <div className="mt-8 w-full max-w-3xl">{preview}</div>}
        </div>
      </GlassCard>
    </StudioLayout>
  );
}
