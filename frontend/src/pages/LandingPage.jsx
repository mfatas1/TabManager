import { Link } from 'react-router-dom';
import { BookOpen, Network, Tag, Sparkles, ArrowRight, Brain } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f7f8f5] text-[#26312d] flex flex-col overflow-hidden">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-24 text-center">

        {/* Eyebrow */}
        <div className="relative inline-flex items-center gap-2.5 rounded-md border border-[#d8ded8] bg-white px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4f8f7a] flex-shrink-0" />
          <span className="font-mono text-[11px] tracking-[0.12em] text-[#68746f] uppercase">
            Bookmark intelligence
          </span>
        </div>

        {/* Headline */}
        <h1 className="relative font-display max-w-3xl text-5xl md:text-7xl font-bold tracking-tight leading-[0.96] mb-7">
          Your bookmarks,{' '}
          <span className="text-[#4f8f7a]">connected.</span>
        </h1>

        <p className="relative max-w-md text-base text-[#68746f] mb-10 leading-relaxed">
          Paste any URL. TabManager scrapes the title and summary, then uses
          AI to extract semantic tags, so related articles cluster naturally.
        </p>

        {/* CTAs */}
        <div className="relative flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/library"
            className="inline-flex items-center gap-2 rounded-md bg-[#315f56] px-7 py-3.5 text-sm font-semibold text-white hover:bg-[#244b44] transition-colors"
          >
            Open Library
            <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/graph"
            className="inline-flex items-center gap-2 rounded-md border border-[#cfd8d1] bg-white px-7 py-3.5 text-sm font-semibold text-[#315f56] hover:border-[#9fb4aa] transition-colors"
          >
            View Graph
            <Network className="size-4" />
          </Link>
        </div>

        {/* Stat strip */}
        <div className="relative mt-16 flex items-center gap-10 text-center">
          {[
            { value: 'AI', label: 'tag extraction' },
            { value: '2×', label: 'tag levels' },
            { value: '∞', label: 'connections' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span className="font-display text-2xl font-bold text-[#26312d]">{value}</span>
              <span className="font-mono text-[11px] text-[#7d8984] uppercase tracking-widest">{label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* ── Features ──────────────────────────────────────────────── */}
      <section className="relative border-t border-[#dfe5df] bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          {/* Section divider */}
          <div className="flex items-center gap-5 mb-12">
            <div className="h-px flex-1 bg-[#dfe5df]" />
            <span className="font-mono text-[11px] tracking-[0.16em] text-[#7d8984] uppercase">Features</span>
            <div className="h-px flex-1 bg-[#dfe5df]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px border border-[#dfe5df] bg-[#dfe5df] rounded-lg overflow-hidden">
            <FeatureCard
              icon={<BookOpen className="size-4 text-[#4f8f7a]" />}
              title="Smart Library"
              description="Paste any URL and get the title, summary, and AI-generated tags automatically."
            />
            <FeatureCard
              icon={<Brain className="size-4 text-[#4f8f7a]" />}
              title="AI Tagging"
              description="OpenAI extracts both broad topic categories and specific descriptive tags for richer connections."
            />
            <FeatureCard
              icon={<Network className="size-4 text-[#4f8f7a]" />}
              title="Knowledge Graph"
              description="See how your saved articles relate. Shared tags pull nodes together into natural clusters."
            />
            <FeatureCard
              icon={<Tag className="size-4 text-[#4f8f7a]" />}
              title="Tag Filtering"
              description="Filter both the library and the graph by any topic."
            />
            <FeatureCard
              icon={<Sparkles className="size-4 text-[#4f8f7a]" />}
              title="Force-Directed Layout"
              description="The graph uses physics simulation to arrange related content."
            />
            <FeatureCard
              icon={<ArrowRight className="size-4 text-[#4f8f7a]" />}
              title="Instant Access"
              description="Click any node to open a detail panel. Click any tag to filter without leaving the page."
            />
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-[#dfe5df] bg-white py-8 text-center">
        <span className="font-mono text-[11px] tracking-[0.16em] text-[#7d8984] uppercase">
          TabManager — FastAPI · React · OpenAI
        </span>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="group p-7 bg-white hover:bg-[#f7f8f5] transition-colors">
      <div className="mb-5 size-9 rounded-md bg-[#edf4ef] border border-[#d8ded8] flex items-center justify-center transition-colors">
        {icon}
      </div>
      <h3 className="font-display text-sm font-semibold text-[#26312d] mb-2">{title}</h3>
      <p className="text-sm text-[#68746f] leading-relaxed">{description}</p>
    </div>
  );
}
