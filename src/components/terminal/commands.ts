import { portfolioData, SKILL_LEVEL_LABEL } from "@/lib/portfolio-data";

export interface CommandSpec {
  name: string;
  usage: string;
  description: string;
}

/** Registry used for `help`, autocomplete, and unknown-command suggestions. */
export const COMMANDS: CommandSpec[] = [
  { name: "help", usage: "help", description: "Show this list of commands." },
  { name: "about", usage: "about", description: "Introduce Adrian." },
  {
    name: "skills",
    usage: "skills",
    description: "List skills, honestly labeled.",
  },
  {
    name: "projects",
    usage: "projects",
    description: "List projects with honest progress labels.",
  },
  {
    name: "education",
    usage: "education",
    description: "Show degree and university.",
  },
  {
    name: "experience",
    usage: "experience",
    description: "Show verified experience.",
  },
  {
    name: "lab",
    usage: "lab",
    description: "Open the Arduino Lab and run sketches in the browser.",
  },
  { name: "clear", usage: "clear", description: "Clear the terminal output." },
  { name: "home", usage: "home", description: "Return to the overview." },
];

export function helpText(): string {
  const width = Math.max(...COMMANDS.map((c) => c.usage.length)) + 3;
  const lines = COMMANDS.map(
    (c) => `  ${c.usage.padEnd(width)}${c.description}`,
  );
  return [
    "Available commands:",
    ...lines,
    "",
    "Tips:",
    "  ↑ / ↓   Browse command history",
    "  Tab     Autocomplete a command name",
    "",
    "This terminal explores the same content as the overview page. Nothing here",
    "requires command-line experience. Tap a command below if you'd rather not type.",
  ].join("\n");
}

export function aboutText(): string {
  const d = portfolioData;
  return [
    `${d.name}, ${d.headline}`,
    `${d.location}`,
    "",
    d.summary,
    "",
    "Current focus:",
    ...d.currentFocus.map((f) => `  - ${f}`),
  ].join("\n");
}

export function skillsText(): string {
  const d = portfolioData;
  return [
    "Skills (honestly labeled: no percentages, no invented mastery):",
    "",
    ...d.skills.flatMap((s) => [
      `${s.name} [${SKILL_LEVEL_LABEL[s.level]}]`,
      `  ${s.note}`,
    ]),
  ].join("\n");
}

export function projectsText(): string {
  const d = portfolioData;
  return [
    "Projects:",
    "",
    ...d.projects.flatMap((p) => {
      const lines = [`${p.name} (${p.statusLabel})`, `  ${p.summary}`];
      p.details.forEach((det) => lines.push(`  - ${det}`));
      if (p.experiments?.length) {
        lines.push("  What I tried after:");
        p.experiments.forEach((ex) => lines.push(`    - ${ex}`));
      }
      if (p.tech.length > 0) lines.push(`  Tech: ${p.tech.join(", ")}`);
      if (p.link) lines.push(`  Link: ${p.link}`);
      return [...lines, ""];
    }),
  ]
    .join("\n")
    .trimEnd();
}

export function educationText(): string {
  const d = portfolioData;
  return [
    "Education:",
    "",
    ...d.education.flatMap((e) => [
      `${e.degree}`,
      `  ${e.institution}`,
      `  Status: ${e.status} (${e.period})`,
    ]),
  ].join("\n");
}

export function experienceText(): string {
  const d = portfolioData;
  return [
    "Experience:",
    "",
    ...d.experience.flatMap((e) => [
      `${e.role} at ${e.org}`,
      `  ${e.period}`,
      `  ${e.description}`,
      "",
    ]),
  ]
    .join("\n")
    .trimEnd();
}

export function getCompletions(prefix: string): string[] {
  if (!prefix) return [];
  const lower = prefix.toLowerCase();
  return COMMANDS.map((c) => c.name).filter((name) => name.startsWith(lower));
}
