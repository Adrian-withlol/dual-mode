import Image from "next/image";
import { portfolioData, SKILL_LEVEL_LABEL } from "@/lib/portfolio-data";

const statusStyles: Record<string, string> = {
  prototype: "text-accent-strong",
  "in-progress": "text-accent-strong",
  planned: "text-ink-faint",
  "documented-later": "text-ink-faint",
};

export default function Overview({
  onOpenTerminal,
}: {
  onOpenTerminal: () => void;
}) {
  const d = portfolioData;
  const featured = d.projects.find((p) => p.image);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 pb-28 pt-16 sm:px-8 sm:pt-24">
      <header className="mb-16 grid items-end gap-12 sm:mb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
        <div>
          <h1 className="rise text-5xl font-semibold leading-[0.95] tracking-[-0.045em] text-ink sm:text-7xl">
            {d.name}
          </h1>
          <p
            className="rise mt-5 max-w-[42ch] text-xl leading-snug tracking-[-0.01em] text-ink-muted text-balance sm:text-2xl"
            style={{ "--rise-delay": "80ms" } as React.CSSProperties}
          >
            {d.headline}, based in {d.location}.
          </p>

          <div
            className="rise mt-10 flex flex-wrap items-center gap-3"
            style={{ "--rise-delay": "160ms" } as React.CSSProperties}
          >
            <a
              href="#projects"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-[background-color,transform] duration-200 hover:bg-accent-strong active:scale-[0.98]"
            >
              Explore my projects
            </a>
            <button
              type="button"
              onClick={onOpenTerminal}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-ink-faint px-4 py-2.5 font-mono text-sm text-ink-muted transition-[border-color,color,transform] duration-200 hover:border-accent hover:text-accent-strong active:scale-[0.98]"
            >
              <span aria-hidden>&gt;_</span> Open the terminal
            </button>
          </div>

          <ul
            className="rise mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm"
            style={{ "--rise-delay": "220ms" } as React.CSSProperties}
          >
            {d.contact.map((c) => (
              <li key={c.href}>
                <a
                  href={c.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-11 items-center gap-1 text-ink-muted underline decoration-hairline underline-offset-4 transition-colors hover:text-accent-strong hover:decoration-accent"
                >
                  {c.label}
                  <span aria-hidden className="text-ink-faint">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {featured?.image && (
          <figure
            className="rise"
            style={{ "--rise-delay": "140ms" } as React.CSSProperties}
          >
            <a
              href={`#${featured.id}`}
              className="group block overflow-hidden rounded-xl bg-term-bg shadow-[0_24px_60px_-28px_rgba(40,20,10,0.55)]"
            >
              <Image
                src={featured.image.src}
                alt={featured.image.alt}
                width={featured.image.width}
                height={featured.image.height}
                sizes="(min-width: 1024px) 520px, 100vw"
                preload
                className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.02]"
              />
            </a>
            <figcaption className="mt-3 text-sm text-ink-faint">
              {featured.name}, built with Arduino.
            </figcaption>
          </figure>
        )}
      </header>

      <Section title="Background">
        <p className="max-w-[62ch] text-lg leading-relaxed text-ink-muted text-pretty sm:text-xl sm:leading-relaxed">
          {d.summary}
        </p>
      </Section>

      <Section title="Current focus">
        <ul className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
          {d.currentFocus.map((item) => (
            <li key={item} className="flex gap-3 text-base text-ink-muted">
              <span
                aria-hidden
                className="mt-[0.7em] h-px w-3 shrink-0 bg-accent"
              />
              <span className="text-pretty">{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Education">
        <div className="space-y-4">
          {d.education.map((e) => (
            <div key={e.institution}>
              <p className="text-lg font-medium tracking-[-0.01em] text-ink">
                {e.degree}
              </p>
              <p className="mt-0.5 text-ink-muted">{e.institution}</p>
              <p className="mt-0.5 text-sm text-ink-faint">
                {e.status}, {e.period.toLowerCase()}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Skills">
        <dl className="grid gap-x-10 sm:grid-cols-2">
          {d.skills.map((s) => (
            <div key={s.name} className="border-t border-hairline py-5">
              <dt className="flex items-baseline justify-between gap-4">
                <span className="font-medium text-ink">{s.name}</span>
                <span className="shrink-0 font-mono text-xs text-accent-strong">
                  {SKILL_LEVEL_LABEL[s.level]}
                </span>
              </dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-ink-muted text-pretty">
                {s.note}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Projects" id="projects">
        <div>
          {d.projects.map((p, i) => (
            <article
              key={p.id}
              id={p.id}
              className={`scroll-mt-24 border-t border-hairline py-7 ${i === 0 ? "pt-0 border-t-0" : ""}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
                  {p.name}
                </h3>
                <span
                  className={`shrink-0 font-mono text-xs ${statusStyles[p.status]}`}
                >
                  {p.statusLabel}
                </span>
              </div>
              <p className="mt-2 max-w-[62ch] text-ink-muted text-pretty">
                {p.summary}
              </p>
              {p.details.length > 0 && (
                <ul className="mt-4 max-w-[62ch] space-y-2">
                  {p.details.map((det) => (
                    <li key={det} className="flex gap-3 text-sm text-ink-muted">
                      <span
                        aria-hidden
                        className="mt-[0.65em] h-px w-3 shrink-0 bg-ink-faint"
                      />
                      <span className="text-pretty">{det}</span>
                    </li>
                  ))}
                </ul>
              )}
              {p.experiments && p.experiments.length > 0 && (
                <div className="mt-5 max-w-[62ch]">
                  <h4 className="text-sm font-semibold text-ink">
                    What I tried after
                  </h4>
                  <ul className="mt-2 space-y-2">
                    {p.experiments.map((ex) => (
                      <li
                        key={ex}
                        className="flex gap-3 text-sm text-ink-muted"
                      >
                        <span
                          aria-hidden
                          className="mt-[0.65em] h-px w-3 shrink-0 bg-accent"
                        />
                        <span className="text-pretty">{ex}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {p.tech.length > 0 && (
                <p className="mt-4 font-mono text-xs text-ink-faint">
                  {p.tech.join(", ")}
                </p>
              )}
              {p.code?.map((c) => (
                <details
                  key={c.filename}
                  className="group mt-3 max-w-[72ch] first-of-type:mt-5"
                >
                  <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 font-mono text-sm text-accent-strong underline decoration-hairline underline-offset-4 transition-colors hover:decoration-accent [&::-webkit-details-marker]:hidden [&::marker]:content-none">
                    <span
                      aria-hidden
                      className="inline-block transition-transform duration-200 group-open:rotate-90"
                    >
                      ›
                    </span>
                    {c.label}
                  </summary>
                  <div className="mt-3 overflow-hidden rounded-lg border border-term-border bg-term-bg">
                    <p className="border-b border-term-border px-4 py-2 font-mono text-xs text-term-fg-dim">
                      {c.filename}
                    </p>
                    <pre className="term-scrollbar max-h-[28rem] overflow-auto p-4 font-mono text-[13px] leading-relaxed text-term-fg">
                      <code>{c.source}</code>
                    </pre>
                  </div>
                </details>
              ))}
              {p.link && (
                <a
                  href={p.link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-md border border-ink-faint px-4 font-mono text-sm text-accent-strong transition-[border-color,color,transform] duration-200 hover:border-accent hover:text-accent active:scale-[0.98]"
                >
                  {p.linkLabel ?? "View project"}
                  <span aria-hidden>↗</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
            </article>
          ))}
        </div>
      </Section>

      <Section title="Experience">
        <div className="space-y-7">
          {d.experience.map((e) => (
            <div key={e.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-lg font-medium tracking-[-0.01em] text-ink">
                  {e.role}{" "}
                  <span className="font-normal text-ink-muted">at {e.org}</span>
                </p>
                <p className="font-mono text-xs text-ink-faint">{e.period}</p>
              </div>
              <p className="mt-1.5 max-w-[62ch] text-sm leading-relaxed text-ink-muted text-pretty">
                {e.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <div className="mt-12 border-t border-hairline pt-8 md:ml-[calc(11rem+2.5rem)]">
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
      </div>
    </div>
  );
}

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="grid scroll-mt-20 gap-5 border-t border-hairline pb-16 pt-8 md:grid-cols-[11rem_1fr] md:gap-10 md:pb-20"
    >
      <h2 className="text-base font-semibold tracking-[-0.01em] text-ink md:sticky md:top-24 md:self-start">
        {title}
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
