import { Link } from 'react-router-dom';
import { BookOpen, Network, Tag, Sparkles, ArrowRight, Brain } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex flex-col">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300 mb-8">
          <Sparkles className="size-3" />
          AI-powered bookmark intelligence
        </div>

        {/* Headline */}
        <h1 className="max-w-3xl text-5xl font-bold tracking-tight leading-tight mb-6">
          Your bookmarks,{' '}
          <span className="text-indigo-400">connected.</span>
        </h1>

        <p className="max-w-xl text-lg text-slate-400 mb-10 leading-relaxed">
          TabManager saves URLs, scrapes titles and summaries, then uses AI to
          extract semantic tags — so related articles naturally cluster together
          in a knowledge graph.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/library"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
          >
            Open Library
            <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/graph"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            View Graph
            <Network className="size-4" />
          </Link>
        </div>
      </main>

      {/* ── Features ──────────────────────────────────────────────── */}
      <section className="border-t border-white/5 bg-[#0d0f16] px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold mb-12 text-slate-200">
            Everything in one place
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<BookOpen className="size-5 text-indigo-400" />}
              title="Smart Library"
              description="Paste any URL and get the title, summary, and AI-generated tags automatically — no manual work."
            />
            <FeatureCard
              icon={<Brain className="size-5 text-indigo-400" />}
              title="AI Tagging"
              description="OpenAI extracts both broad topic categories and specific descriptive tags for richer connections."
            />
            <FeatureCard
              icon={<Network className="size-5 text-indigo-400" />}
              title="Knowledge Graph"
              description="See how your saved articles relate. Shared tags pull nodes together into natural clusters."
            />
            <FeatureCard
              icon={<Tag className="size-5 text-indigo-400" />}
              title="Tag Filtering"
              description="Filter both the library and the graph by any topic — focus on ML, finance, or whatever matters now."
            />
            <FeatureCard
              icon={<Sparkles className="size-5 text-indigo-400" />}
              title="Force-Directed Layout"
              description="The graph uses physics simulation to arrange nodes — related content clusters organically."
            />
            <FeatureCard
              icon={<ArrowRight className="size-5 text-indigo-400" />}
              title="Instant Access"
              description="Click any node to open a detail panel. Click any tag to filter without leaving the page."
            />
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-600">
        TabManager — built with FastAPI, React &amp; OpenAI
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-6 flex flex-col gap-3 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-colors">
      <div className="size-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}
