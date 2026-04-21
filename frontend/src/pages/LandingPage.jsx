import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, FolderKanban, Network, Tag } from 'lucide-react';
import { useAuth } from '../auth/useAuth';

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();
  const primaryPath = isAuthenticated ? '/library' : '/login';
  const primaryLabel = isAuthenticated ? 'Get started' : 'Sign in';

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-[#26312d] flex flex-col">

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-24 text-center">

        <div className="inline-flex items-center gap-2.5 rounded-md border border-[var(--tm-border)] bg-white px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--tm-accent)] flex-shrink-0" />
          <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--tm-text-secondary)] uppercase">
            Personal research tool
          </span>
        </div>

        <h1 className="font-display max-w-2xl text-5xl md:text-7xl font-bold tracking-tight leading-[0.96] mb-7">
          Save what you read.{' '}
          <span className="text-[var(--tm-accent)]">See how it connects.</span>
        </h1>

        <p className="max-w-sm text-base text-[var(--tm-text-secondary)] mb-10 leading-relaxed">
          Paste a URL and Folio pulls the title, summary, and key topics automatically.
          Over time, a picture of how your reading fits together starts to form.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to={primaryPath}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--tm-accent-hover)] px-7 py-3.5 text-sm font-semibold text-white hover:bg-[var(--tm-accent-hover)] transition-colors"
          >
            {loading ? 'Loading...' : primaryLabel}
            <ArrowRight className="size-4" />
          </Link>
          {isAuthenticated && (
            <Link
              to="/graph"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--tm-border-mid)] bg-white px-7 py-3.5 text-sm font-semibold text-[var(--tm-accent-hover)] hover:border-[#9fb4aa] transition-colors"
            >
              View graph
              <Network className="size-4" />
            </Link>
          )}
        </div>
      </main>

      {/* How it works */}
      <section className="border-t border-[#e8dff2] bg-white px-6 py-20">
        <div className="mx-auto max-w-4xl">

          <div className="flex items-center gap-5 mb-14">
            <div className="h-px flex-1 bg-[#e8dff2]" />
            <span className="font-mono text-[11px] tracking-[0.16em] text-[var(--tm-text-disabled)] uppercase">How it works</span>
            <div className="h-px flex-1 bg-[#e8dff2]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <Step
              number="01"
              title="Save a link"
              description="Paste any URL into your library. Folio fetches the page and uses AI to write a short summary and assign topic tags with no input needed from you."
            />
            <Step
              number="02"
              title="Explore the connections"
              description="Your library builds into a knowledge graph. Articles that share topics cluster together. You'll start to see patterns in what you read that are not obvious in a flat list."
            />
            <Step
              number="03"
              title="Organise your research"
              description="Group links into projects when you're working towards something specific. Add tasks, track reading status, and keep everything in one place."
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[#e8dff2] bg-[#f7f8f5] px-6 py-20">
        <div className="mx-auto max-w-4xl">

          <div className="flex items-center gap-5 mb-14">
            <div className="h-px flex-1 bg-[#e8dff2]" />
            <span className="font-mono text-[11px] tracking-[0.16em] text-[var(--tm-text-disabled)] uppercase">What's included</span>
            <div className="h-px flex-1 bg-[#e8dff2]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px border border-[#e8dff2] bg-[#e8dff2] rounded-lg overflow-hidden">
            <FeatureCard
              icon={<BookOpen className="size-4 text-[var(--tm-accent)]" />}
              title="Library"
              description="Every link you save lives here. Search, filter by topic, sort by date or name, and edit the title or summary if the AI got it wrong."
            />
            <FeatureCard
              icon={<Network className="size-4 text-[var(--tm-accent)]" />}
              title="Knowledge graph"
              description="A visual map of your reading. Topics become hubs, and links cluster around the subjects they cover. Filter to any topic to focus in."
            />
            <FeatureCard
              icon={<FolderKanban className="size-4 text-[var(--tm-accent)]" />}
              title="Projects"
              description="When you're researching something specific, group relevant links into a project. Track reading status per link and attach tasks to keep things moving."
            />
            <FeatureCard
              icon={<Tag className="size-4 text-[var(--tm-accent)]" />}
              title="Tag editing"
              description="The AI assigns topic tags automatically. They're mostly right, but you can remove ones that don't fit, add your own, and reuse tags across links."
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e8dff2] bg-white py-8 text-center">
        <span className="font-mono text-[11px] tracking-[0.16em] text-[var(--tm-text-faint)] uppercase">
          Folio
        </span>
      </footer>

    </div>
  );
}

function Step({ number, title, description }) {
  return (
    <div className="flex flex-col gap-4">
      <span className="font-mono text-[11px] tracking-[0.2em] text-[var(--tm-text-muted)]">{number}</span>
      <h3 className="font-display text-lg font-semibold text-[#26312d] leading-snug">{title}</h3>
      <p className="text-sm text-[var(--tm-text-secondary)] leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="p-7 bg-white">
      <div className="mb-5 size-9 rounded-md bg-[var(--tm-accent-bg)] border border-[var(--tm-border)] flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-display text-sm font-semibold text-[#26312d] mb-2">{title}</h3>
      <p className="text-sm text-[var(--tm-text-secondary)] leading-relaxed">{description}</p>
    </div>
  );
}
