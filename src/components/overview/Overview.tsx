import { portfolioData, SKILL_LEVEL_LABEL } from "@/lib/portfolio-data";

const statusStyles: Record<string, string> = {
  "in-progress": "border-accent/40 bg-accent/10 text-accent-strong",
  planned: "border-hairline bg-paper text-ink-muted",
  "documented-later": "border-hairline bg-paper text-ink-muted",
};

export default function Overview({
  onOpenTerminal,
}: {
  onOpenTerminal: () => void;
}) {
  const d = portfolioData;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-24 pt-14 sm:px-8 sm:pt-20">
      <header className="mb-16">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">
          Portfolio
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
          {d.name}
        </h1>
        <p className="mt-3 text-lg text-ink-muted sm:text-xl">{d.headline}</p>
        <p className="mt-1 text-sm text-ink-faint">{d.location}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenTerminal}
            className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2.5 font-mono text-sm text-paper transition-colors hover:bg-accent-strong"
          >
            <span aria-hidden>&gt;_</span> Open the terminal
          </button>
          {d.contact.map((c) => (
            <a
              key={c.href}
              href={c.href}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-md border border-hairline px-4 py-2.5 text-sm text-ink-muted transition-colors hover:border-accent hover:text-accent-strong"
            >
              {c.label}
            </a>
          ))}
        </div>
      </header>

      <Section title="Background">
        <p className="text-base leading-relaxed text-ink-muted sm:text-lg">
          {d.summary}
        </p>
      </Section>

      <Section title="Current focus">
        <ul className="space-y-2.5">
          {d.currentFocus.map((item) => (
            <li key={item} className="flex gap-3 text-base text-ink-muted">
              <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Education">
        <div className="space-y-4">
          {d.education.map((e) => (
            <div key={e.institution}>
              <p className="text-base font-medium text-ink">{e.degree}</p>
              <p className="text-sm text-ink-muted">{e.institution}</p>
              <p className="text-sm text-ink-faint">
                {e.status} · {e.period}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Skills">
        <p className="mb-5 text-sm text-ink-faint">
          Labeled honestly by how far along each one is — no percentage bars.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {d.skills.map((s) => (
            <div
              key={s.name}
              className="rounded-lg border border-hairline bg-paper-raised p-4"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="font-medium text-ink">{s.name}</p>
                <span className="shrink-0 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent-strong">
                  {SKILL_LEVEL_LABEL[s.level]}
                </span>
              </div>
              <p className="text-sm text-ink-muted">{s.note}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Projects">
        <div className="space-y-5">
          {d.projects.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-hairline bg-paper-raised p-5"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-medium text-ink">{p.name}</h3>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[p.status]}`}
                >
                  {p.statusLabel}
                </span>
              </div>
              <p className="text-sm text-ink-muted">{p.summary}</p>
              {p.details.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {p.details.map((det) => (
                    <li key={det} className="flex gap-2 text-sm text-ink-muted">
                      <span aria-hidden className="text-ink-faint">
                        —
                      </span>
                      <span>{det}</span>
                    </li>
                  ))}
                </ul>
              )}
              {p.tech.length > 0 && (
                <p className="mt-3 font-mono text-xs text-ink-faint">
                  {p.tech.join(" · ")}
                </p>
              )}
              {p.link && (
                <a
                  href={p.link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-3 inline-block text-sm text-accent-strong underline underline-offset-4 hover:text-accent"
                >
                  View project →
                </a>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Experience">
        <div className="space-y-6">
          {d.experience.map((e) => (
            <div key={e.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="font-medium text-ink">
                  {e.role} <span className="text-ink-muted">· {e.org}</span>
                </p>
                <p className="text-sm text-ink-faint">{e.period}</p>
              </div>
              <p className="mt-1 text-sm text-ink-muted">{e.description}</p>
            </div>
          ))}
        </div>
      </Section>

      <footer className="mt-20 border-t border-hairline pt-8">
        <p className="text-sm text-ink-faint">
          Prefer exploring by typing?{" "}
          <button
            type="button"
            onClick={onOpenTerminal}
            className="font-mono text-accent-strong underline underline-offset-4 hover:text-accent"
          >
            Open the terminal
          </button>{" "}
          and try <code className="font-mono">help</code>.
        </p>
      </footer>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-14">
      <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.15em] text-ink-faint">
        {title}
      </h2>
      {children}
    </section>
  );
}
