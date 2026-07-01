import type { Artifact } from "@/lib/api";

/* Renders the `content` JSON of any generated artifact into a readable,
   on-brand layout. One component so the generator result panes and the
   library detail view stay consistent. */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] uppercase tracking-[0.24em] text-[var(--gold-dim)]">
        {title}
      </div>
      <div className="text-sm leading-relaxed text-foreground/90">{children}</div>
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it, i) => (
        <span
          key={i}
          className="rounded-full border border-[oklch(0.85_0.155_86/0.25)] bg-[oklch(0.85_0.155_86/0.06)] px-2.5 py-1 text-xs text-[var(--gold-bright)]"
        >
          {it}
        </span>
      ))}
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-sm text-foreground/90">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--gold-bright)]" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export function ArtifactContent({ artifact }: { artifact: Artifact }) {
  const c = (artifact.content ?? {}) as Record<string, any>;

  if (artifact.kind === "story" || (artifact.kind === "template" && c.template_kind === "story")) {
    return (
      <div className="space-y-5">
        {c.logline && <Section title="Logline">{c.logline}</Section>}
        <div className="flex flex-wrap gap-2">
          {c.genre && <Chips items={[c.genre]} />}
          {c.tone && <Chips items={[c.tone]} />}
        </div>
        {c.synopsis && <Section title="Synopsis"><p className="whitespace-pre-line">{c.synopsis}</p></Section>}
        {Array.isArray(c.themes) && c.themes.length > 0 && (
          <Section title="Themes"><Chips items={c.themes} /></Section>
        )}
        {Array.isArray(c.main_characters) && c.main_characters.length > 0 && (
          <Section title="Main Characters"><Bullets items={c.main_characters} /></Section>
        )}
        {Array.isArray(c.three_act_beats) && c.three_act_beats.length > 0 && (
          <Section title="Act Beats"><Bullets items={c.three_act_beats} /></Section>
        )}
        {Array.isArray(c.structure) && <Section title="Structure"><Bullets items={c.structure} /></Section>}
        {c.prompt_starter && <Section title="Prompt Starter">{c.prompt_starter}</Section>}
      </div>
    );
  }

  if (artifact.kind === "script" || (artifact.kind === "template" && c.template_kind === "script")) {
    return (
      <div className="space-y-5">
        {c.logline && <Section title="Logline">{c.logline}</Section>}
        {Array.isArray(c.scenes) &&
          c.scenes.map((s: any, i: number) => (
            <div key={i} className="rounded-xl border border-white/5 bg-black/30 p-4">
              <div className="font-mono text-xs uppercase tracking-widest text-[var(--gold-bright)]">
                {s.heading}
              </div>
              {s.action && <p className="mt-2 text-sm leading-relaxed text-foreground/80">{s.action}</p>}
              {Array.isArray(s.dialogue) && s.dialogue.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {s.dialogue.map((line: string, j: number) => (
                    <p key={j} className="text-sm text-foreground/90">{line}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        {Array.isArray(c.scenes_outline) && <Section title="Scene Outline"><Bullets items={c.scenes_outline} /></Section>}
        {c.prompt_starter && <Section title="Prompt Starter">{c.prompt_starter}</Section>}
      </div>
    );
  }

  if (artifact.kind === "character" || (artifact.kind === "template" && c.template_kind === "character")) {
    return (
      <div className="space-y-5">
        {c.one_line && <Section title="Summary">{c.one_line}</Section>}
        <div className="flex flex-wrap gap-2">
          {c.role && <Chips items={[c.role]} />}
          {c.age_range && <Chips items={[c.age_range]} />}
        </div>
        {c.backstory && <Section title="Backstory"><p className="whitespace-pre-line">{c.backstory}</p></Section>}
        {Array.isArray(c.personality_traits) && c.personality_traits.length > 0 && (
          <Section title="Personality"><Chips items={c.personality_traits} /></Section>
        )}
        {Array.isArray(c.motivations) && c.motivations.length > 0 && (
          <Section title="Motivations"><Bullets items={c.motivations} /></Section>
        )}
        {Array.isArray(c.flaws) && c.flaws.length > 0 && (
          <Section title="Flaws"><Bullets items={c.flaws} /></Section>
        )}
        {c.arc && <Section title="Arc">{c.arc}</Section>}
        {c.visual_description && <Section title="Visual">{c.visual_description}</Section>}
        {Array.isArray(c.fields) && <Section title="Fields"><Chips items={c.fields} /></Section>}
        {c.prompt_starter && <Section title="Prompt Starter">{c.prompt_starter}</Section>}
      </div>
    );
  }

  if (artifact.kind === "world" || (artifact.kind === "template" && c.template_kind === "world")) {
    return (
      <div className="space-y-5">
        {c.overview && <Section title="Overview"><p className="whitespace-pre-line">{c.overview}</p></Section>}
        {c.geography && <Section title="Geography">{c.geography}</Section>}
        {c.history && <Section title="History">{c.history}</Section>}
        {Array.isArray(c.rules) && c.rules.length > 0 && <Section title="Rules"><Bullets items={c.rules} /></Section>}
        {Array.isArray(c.locations) && c.locations.length > 0 && (
          <Section title="Locations">
            <div className="space-y-2">
              {c.locations.map((l: any, i: number) => (
                <div key={i} className="rounded-lg border border-white/5 bg-black/20 p-3">
                  <div className="text-sm text-foreground">{l.name}</div>
                  <div className="text-xs text-muted-foreground">{l.description}</div>
                </div>
              ))}
            </div>
          </Section>
        )}
        {Array.isArray(c.factions) && c.factions.length > 0 && (
          <Section title="Factions">
            <div className="space-y-2">
              {c.factions.map((f: any, i: number) => (
                <div key={i} className="rounded-lg border border-white/5 bg-black/20 p-3">
                  <div className="text-sm text-foreground">{f.name}</div>
                  <div className="text-xs text-muted-foreground">{f.description}</div>
                </div>
              ))}
            </div>
          </Section>
        )}
        {Array.isArray(c.fields) && <Section title="Fields"><Chips items={c.fields} /></Section>}
        {c.prompt_starter && <Section title="Prompt Starter">{c.prompt_starter}</Section>}
      </div>
    );
  }

  if (artifact.kind === "storyboard" || (artifact.kind === "template" && c.template_kind === "storyboard")) {
    return (
      <div className="space-y-5">
        {c.summary && <Section title="Sequence">{c.summary}</Section>}
        {Array.isArray(c.panels) && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.panels.map((p: any, i: number) => (
              <div key={i} className="rounded-xl border border-white/5 bg-black/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[var(--gold-bright)]">Panel {p.panel_number}</span>
                </div>
                <div className="mt-2 flex aspect-video flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/10 bg-black/40 p-2 text-center">
                  <div className="text-xs font-semibold text-foreground">{p.shot_type}</div>
                  <div className="text-[10px] text-muted-foreground">{p.camera_angle}</div>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-foreground/80">{p.description}</p>
                {p.mood_lighting && <p className="mt-1 text-[11px] text-muted-foreground">Mood: {p.mood_lighting}</p>}
                {p.key_visual_elements && <p className="text-[11px] text-muted-foreground">Elements: {p.key_visual_elements}</p>}
              </div>
            ))}
          </div>
        )}
        {Array.isArray(c.coverage) && <Section title="Coverage"><Bullets items={c.coverage} /></Section>}
        {c.prompt_starter && <Section title="Prompt Starter">{c.prompt_starter}</Section>}
      </div>
    );
  }

  // Fallback: pretty-print whatever's there.
  return (
    <pre className="overflow-x-auto rounded-lg border border-white/5 bg-black/30 p-4 text-xs text-foreground/80">
      {JSON.stringify(c, null, 2)}
    </pre>
  );
}
