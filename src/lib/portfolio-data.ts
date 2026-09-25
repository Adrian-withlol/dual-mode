/**
 * Single source of truth for portfolio content.
 *
 * This file feeds the Overview page and every terminal command. Edit this
 * file to update the site; there is nowhere else content should be
 * duplicated. Keep every claim here honest and verifiable.
 */

import {
  intervalTimerSketch,
  jingleBellsSketch,
} from "./sketches/interval-timer";
import type { LabConfig } from "./arduino/lab";

export type SkillLevel = "learning" | "foundational" | "comfortable";

export interface Skill {
  name: string;
  level: SkillLevel;
  note: string;
}

export type ProjectStatus =
  "prototype" | "in-progress" | "planned" | "documented-later";

export interface ProjectImage {
  /** Path under /public. */
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  statusLabel: string;
  summary: string;
  details: string[];
  tech: string[];
  link?: string;
  /** Text for the link button; defaults to "View project". */
  linkLabel?: string;
  image?: ProjectImage;
  code?: ProjectCode[];
  /** Variations tried beyond the main build. */
  experiments?: string[];
  /** Interactive simulator shown with the project (see src/lib/arduino/lab.ts). */
  lab?: LabConfig;
}

export interface ProjectCode {
  /** Button text, e.g. "View the code". */
  label: string;
  filename: string;
  source: string;
}

export interface ExperienceEntry {
  id: string;
  role: string;
  org: string;
  period: string;
  description: string;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  status: string;
  period: string;
}

export interface ContactLink {
  label: string;
  href: string;
}

export interface PortfolioData {
  name: string;
  headline: string;
  location: string;
  summary: string;
  currentFocus: string[];
  education: EducationEntry[];
  skills: Skill[];
  projects: Project[];
  experience: ExperienceEntry[];
  contact: ContactLink[];
}

export const SKILL_LEVEL_LABEL: Record<SkillLevel, string> = {
  learning: "Learning",
  foundational: "Foundational",
  comfortable: "Comfortable",
};

export const portfolioData: PortfolioData = {
  name: "Adrian Vela",
  headline: "Mechanical engineering student at UTRGV",
  location: "Rio Grande Valley, Texas",
  summary:
    "I'm a mechanical engineering student at the University of Texas Rio Grande Valley. " +
    "Right now that means coursework, picking up MATLAB, tutoring math, and building " +
    "software on the side to get more comfortable writing code that solves real problems.",
  currentFocus: [
    "Coursework toward a mechanical engineering degree at UTRGV",
    "Learning MATLAB for engineering analysis",
    "Building foundational C++ experience",
    "Tutoring precalculus through Calculus 3 on schoolhouse.world, helping students understand the concepts (since May 2026)",
    "Developing Lamplight Planner using AI coding tools",
    "Member of SARE UTRGV",
  ],
  education: [
    {
      institution: "The University of Texas Rio Grande Valley (UTRGV)",
      degree: "B.S., Mechanical Engineering",
      status: "In progress",
      period: "Current",
    },
  ],
  skills: [
    {
      name: "MATLAB",
      level: "learning",
      note: "Currently learning MATLAB for engineering coursework and analysis.",
    },
    {
      name: "C++",
      level: "foundational",
      note: "Foundational experience. Comfortable with core syntax and basic programs, still building depth.",
    },
    {
      name: "Math tutoring (precalculus through Calculus 3)",
      level: "comfortable",
      note: "Tutoring every level from precalculus through Calculus 3 on schoolhouse.world since May 2026, with a focus on helping students understand the concepts better.",
    },
    {
      name: "AI-assisted software development",
      level: "foundational",
      note: "Building Lamplight Planner using AI coding tools and learning software development practices hands-on.",
    },
  ],
  projects: [
    {
      id: "arduino-interval-timer",
      name: "10-minute interval timer",
      status: "prototype",
      statusLabel: "Working prototype",
      summary:
        "An Arduino timer that lights one of six LEDs every 10 minutes, prototyped on a breadboard.",
      details: [
        "Based on the Digital Hourglass project from the Arduino Starter Kit, then modified.",
        "Uses millis() instead of delay() for timing, so the board keeps reading the tilt sensor while it counts.",
        "When all six LEDs are lit (one hour), the row clears and the count starts over.",
        "Tilting the board resets the timer.",
      ],
      experiments: [
        "Reprogrammed the LEDs to flash in the rhythm of the Jingle Bells chorus.",
        "Changed the time periods to see how the timer behaved at different intervals.",
        "Reworked the reset so it runs without the tilt sensor, making the timer fully automatic.",
      ],
      tech: ["Arduino", "C++", "Breadboard prototyping"],
      code: [
        {
          label: "View the timer code",
          filename: "interval_timer.ino",
          source: intervalTimerSketch,
        },
        {
          label: "View the Jingle Bells code",
          filename: "jingle_bells_lights.ino",
          source: jingleBellsSketch,
        },
      ],
      image: {
        src: "/projects/arduino-interval-timer.jpg",
        alt: "Arduino interval timer on a breadboard in a dark room, with two of its six red LEDs lit and jumper wires arching over the board.",
        width: 1600,
        height: 1200,
      },
      lab: {
        title: "interval_timer.ino",
        parts: [
          { type: "led", pin: 2, color: "red", label: "10 min" },
          { type: "led", pin: 3, color: "red", label: "20 min" },
          { type: "led", pin: 4, color: "red", label: "30 min" },
          { type: "led", pin: 5, color: "red", label: "40 min" },
          { type: "led", pin: 6, color: "red", label: "50 min" },
          { type: "led", pin: 7, color: "red", label: "60 min" },
          { type: "tilt", pin: 8, label: "Tilt switch" },
          { type: "piezo", pin: 9, label: "Piezo", virtual: true },
        ],
        sketches: [
          {
            id: "timer",
            label: "10-minute timer",
            source: intervalTimerSketch,
            speed: 600,
            note: "Running at 600×, so each 10-minute LED takes about a second. Tip the tilt switch to reset it.",
          },
          {
            id: "jingle",
            label: "Jingle Bells lights",
            source: jingleBellsSketch,
            speed: 1,
            note: "All six LEDs flash the chorus rhythm. The real build has no speaker; the virtual piezo on pin 9 is there if you want to add tone() yourself.",
          },
        ],
      },
    },
    {
      id: "lamplight-planner",
      name: "Lamplight Planner",
      status: "in-progress",
      statusLabel: "In active development",
      summary:
        "A personal planning application being developed with the help of AI coding tools.",
      details: [
        "Built primarily as a way to learn real-world software development by shipping something and iterating on it.",
        "Actively developed, so features and structure are still changing.",
      ],
      tech: ["AI-assisted development"],
      link: "https://planner.avelaworks.online",
      linkLabel: "Try Lamplight",
    },
    {
      id: "sare-utrgv",
      name: "SARE UTRGV",
      status: "documented-later",
      statusLabel: "Member, details coming later",
      summary: "Member of SARE UTRGV.",
      details: [
        "Joined the organization; specific subsystem contributions are not yet documented here.",
        "This entry will be updated once concrete work can be described accurately.",
      ],
      tech: [],
    },
    {
      id: "flagship-project",
      name: "Flagship engineering project",
      status: "planned",
      statusLabel: "Planned for a later phase",
      summary:
        "A more detailed engineering project showcase is planned for a later phase of this site.",
      details: [
        "Intentionally left out for now rather than published before it's ready.",
      ],
      tech: [],
    },
  ],
  experience: [
    {
      id: "schoolhouse-tutor",
      role: "Math Tutor (Precalculus through Calculus 3)",
      org: "schoolhouse.world",
      period: "Since May 2026",
      description:
        "Volunteer tutor covering precalculus, Calculus 1, 2 and 3 on schoolhouse.world, helping students understand the concepts better.",
    },
    {
      id: "sare-member",
      role: "Member",
      org: "SARE UTRGV",
      period: "Current",
      description:
        "Joined SARE UTRGV. Specific subsystem contributions are not yet documented.",
    },
  ],
  contact: [
    { label: "GitHub", href: "https://github.com/Adrian-withlol" },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/adrian-vela-351a86433",
    },
  ],
};
