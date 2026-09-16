import type { Metadata } from "next";
import Link from "next/link";
import { AppPreview } from "@/components/marketing/app-preview";
import { OpenAppButton } from "@/components/marketing/open-app-button";
import {
  CalendarIcon,
  CheckIcon,
  LayersIcon,
  LinkIcon,
  SparkIcon,
  SunriseIcon,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "Proxima — coursework that keeps itself up to date",
  description:
    "Import your Canvas assignments in one click, see them on a calendar, and add anything else in plain English. Everything stays in your browser.",
};

const REPO = "https://github.com/dxianto8/proxima_productivity";

const FEATURES = [
  {
    icon: <LinkIcon size={17} />,
    title: "One-click Canvas import",
    body: "Connect your institution once and pull in assignments, quizzes and discussions with their due dates and point values. Syncing again updates what changed instead of duplicating it — and never touches the notes or priorities you added yourself.",
  },
  {
    icon: <SparkIcon size={17} />,
    title: "Type it the way you'd say it",
    body: "“Essay draft #astr friday 5pm !high ~2h” becomes a task with the right course, due time, priority and estimate. Anything it doesn't recognise stays in the title, so a plain sentence always works.",
  },
  {
    icon: <CalendarIcon size={17} />,
    title: "A calendar you can move things on",
    body: "Month and week views, colour-coded by course. Drag a task to another day to reschedule it — the time of day comes along with it.",
  },
  {
    icon: <LayersIcon size={17} />,
    title: "Not only for classes",
    body: "Name your own sidebar groups for clubs, a job, personal projects — anything. Drag entries between them to reorder.",
  },
  {
    icon: <SunriseIcon size={17} />,
    title: "Make it yours",
    body: "Pick an accent colour, or drop in a background photo and let Proxima build a palette from the colours in it. Light and dark are derived separately so both stay readable.",
  },
  {
    icon: <CheckIcon size={17} />,
    title: "Yours alone",
    body: "Tasks live in your browser, not on a server. There's no account to make and nothing to sign in to. Your Canvas token only ever travels to your own Canvas host.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-bg">
      {/* ------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-[var(--chrome-bar)] [backdrop-filter:var(--chrome-blur)]">
        <nav className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-5">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-accent-text">
              <SparkIcon size={15} />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-text">
              Proxima
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-1 sm:gap-3">
            <Link
              href="#features"
              className="hidden rounded-lg px-2.5 py-1.5 text-[13.5px] text-muted transition-colors hover:text-text sm:block"
            >
              Features
            </Link>
            <a
              href={REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-lg px-2.5 py-1.5 text-[13.5px] text-muted transition-colors hover:text-text sm:block"
            >
              GitHub
            </a>
            <OpenAppButton size="sm" />
          </div>
        </nav>
      </header>

      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden">
        {/* A soft wash of the accent behind the hero. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_70%_at_50%_0%,var(--accent-soft),transparent)]"
        />
        <div className="relative mx-auto w-full max-w-6xl px-5 pb-12 pt-16 sm:pt-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[12px] font-medium text-muted shadow-card">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Built for Canvas
            </span>

            <h1 className="mt-5 text-balance text-[38px] font-semibold leading-[1.08] tracking-[-0.035em] text-text sm:text-[54px]">
              Coursework that keeps itself up to date.
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-pretty text-[16px] leading-relaxed text-muted sm:text-[17.5px]">
              Import your Canvas assignments in one click, see them on a calendar, and
              add everything else in plain English. It all stays in your browser.
            </p>

            <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <OpenAppButton />
              <Link
                href="#features"
                className="inline-flex h-12 items-center rounded-xl border border-border bg-surface px-5 text-[15px] font-medium text-text shadow-card transition-colors hover:border-border-strong"
              >
                See what it does
              </Link>
            </div>

            <p className="mt-4 text-[12.5px] text-subtle">
              No account. No sign-in. Nothing leaves your device.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-4xl sm:mt-16">
            <AppPreview />
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- features */}
      <section id="features" className="scroll-mt-16 border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
          <div className="max-w-xl">
            <h2 className="text-[26px] font-semibold tracking-[-0.03em] text-text sm:text-[32px]">
              The parts that actually save you time
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Proxima is a task tracker shaped around how a term actually runs — deadlines
              that arrive from somewhere else, and everything else you're juggling alongside
              them.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="rounded-xl border border-border bg-surface p-5 shadow-card transition-colors hover:border-border-strong"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
                  {feature.icon}
                </span>
                <h3 className="mt-3.5 text-[15px] font-semibold tracking-[-0.01em] text-text">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- quick add */}
      <section className="border-t border-border bg-surface-2/40">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div className="min-w-0">
            <h2 className="text-[26px] font-semibold tracking-[-0.03em] text-text sm:text-[32px]">
              One line in. A finished task out.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              The capture box parses as you type and shows what it understood before you
              commit, so you never have to trust it blindly.
            </p>

            <dl className="mt-6 space-y-2.5">
              {[
                ["today, friday, next friday, in 3 days, sep 20", "Due date"],
                ["5pm, 5:30pm, at 14:45, noon", "Due time"],
                ["#astr, @math", "Course or group"],
                ["!high, !!, !low", "Priority"],
                ["~90m, ~2h", "Estimate"],
              ].map(([syntax, means]) => (
                <div key={means} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <dt className="font-mono text-[12.5px] text-accent">{syntax}</dt>
                  <dd className="text-[13px] text-muted">{means}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="min-w-0 rounded-xl border border-border bg-surface p-5 shadow-card">
            <div className="flex items-center gap-2.5 rounded-xl border border-accent px-3 py-2.5 ring-2 ring-accent/20">
              <SparkIcon size={16} className="shrink-0 text-accent" />
              <span className="min-w-0 truncate font-mono text-[13px] text-text">
                Essay draft #astr friday 5pm !high ~2h
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["Sep 18, 5:00 PM", "ASTR 201", "High priority", "2h"].map((chip) => (
                <span
                  key={chip}
                  className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent"
                >
                  {chip}
                </span>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-border bg-surface-2/50 p-3">
              <p className="text-[13px] text-text">Essay draft</p>
              <p className="mt-1 text-[11.5px] text-muted">
                ASTR 201 · Friday · 5:00pm · 2h · High
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- closer */}
      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 text-center sm:py-20">
          <h2 className="text-[26px] font-semibold tracking-[-0.03em] text-text sm:text-[32px]">
            Start with today.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted">
            Nothing to install and nothing to sign up for. Open it, and connect Canvas
            whenever you're ready.
          </p>
          <div className="mt-7 flex justify-center">
            <OpenAppButton />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-5 py-7 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-md bg-accent text-accent-text">
              <SparkIcon size={11} />
            </span>
            <span className="text-[13px] font-medium text-muted">Proxima</span>
          </div>
          <div className="flex items-center gap-4 text-[13px] text-muted">
            <Link href="/today" className="transition-colors hover:text-text">
              Open the app
            </Link>
            <Link href="/settings" className="transition-colors hover:text-text">
              Connect Canvas
            </Link>
            <a
              href={REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-text"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
