import { Link } from 'react-router-dom';
import { BookOpen, Network, Tag, Sparkles, ArrowRight, Brain } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090e] text-white flex flex-col overflow-hidden">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 py-36 text-center">
        {/* Glow orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-indigo-600/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[350px] h-[250px] bg-violet-600/8 rounded-full blur-[90px] pointer-events-none" />

        {/* Eyebrow */}
        <div className="relative inline-flex items-center gap-2.5 rounded-full border border-indigo-500/20 bg-indigo-500/6 px-4 py-1.5 mb-10">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse flex-shrink-0" />
          <span className="font-mono text-[11px] tracking-[0.15em] text-indigo-300/90 uppercase">
            AI-Powered Bookmark Intelligence
          </span>
        </div>

        {/* Headline */}
        <h1 className="relative font-display max-w-3xl text-6xl md:text-8xl font-bold tracking-tight leading-[0.92] mb-8">
          Your bookmarks,{' '}
          <span className="text-indigo-400">connected.</span>
        </h1>

        <p className="relative max-w-md text-base text-slate-400 mb-12 leading-relaxed">
          Paste any URL. TabManager scrapes the title and summary, then uses
          AI to extract semantic tags — so related articles cluster naturally.
        </p>

        {/* CTAs */}
        <div className="relative flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/library"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-7 py-3.5 text-sm font-semibold text-white hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
          >
            Open Library
            <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/graph"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/4 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/8 hover:border-white/15 transition-all"
          >
            View Graph
            <Network className="size-4" />
          </Link>
        </div>

        {/* Stat strip */}
        <div className="relative mt-20 flex items-center gap-10 text-center">
          {[
            { value: 'AI', label: 'tag extraction' },
            { value: '2×', label: 'tag levels' },
            { value: '∞', label: 'connections' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span className="font-display text-2xl font-bold text-white">{value}</span>
              <span className="font-mono text-[11px] text-slate-600 uppercase tracking-widest">{label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* ── Features ──────────────────────────────────────────────── */}
      <section className="relative border-t border-white/5 bg-[#06070b] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          {/* Section divider */}
          <div className="flex items-center gap-5 mb-16">
            <div className="h-px flex-1 bg-white/5" />
            <span className="font-mono text-[11px] tracking-[0.2em] text-slate-600 uppercase">Features</span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-white/5 border border-white/5 rounded-2xl overflow-hidden">
            <FeatureCard
              icon={<BookOpen className="size-4 text-indigo-400" />}
              title="Smart Library"
              description="Paste any URL and get the title, summary, and AI-generated tags automatically — no manual work."
            />
            <FeatureCard
              icon={<Brain className="size-4 text-indigo-400" />}
              title="AI Tagging"
              description="OpenAI extracts both broad topic categories and specific descriptive tags for richer connections."
            />
            <FeatureCard
              icon={<Network className="size-4 text-indigo-400" />}
              title="Knowledge Graph"
              description="See how your saved articles relate. Shared tags pull nodes together into natural clusters."
            />
            <FeatureCard
              icon={<Tag className="size-4 text-indigo-400" />}
              title="Tag Filtering"
              description="Filter both the library and the graph by any topic — focus on ML, finance, or whatever matters now."
            />
            <FeatureCard
              icon={<Sparkles className="size-4 text-indigo-400" />}
              title="Force-Directed Layout"
              description="The graph uses physics simulation to arrange nodes — related content clusters organically."
            />
            <FeatureCard
              icon={<ArrowRight className="size-4 text-indigo-400" />}
              title="Instant Access"
              description="Click any node to open a detail panel. Click any tag to filter without leaving the page."
            />
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-[#06070b] py-8 text-center">
        <span className="font-mono text-[11px] tracking-[0.2em] text-slate-700 uppercase">
          TabManager — FastAPI · React · OpenAI
        </span>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="group p-7 bg-[#06070b] hover:bg-indigo-500/[0.03] transition-colors">
      <div className="mb-5 size-9 rounded-lg bg-indigo-500/8 border border-indigo-500/15 flex items-center justify-center group-hover:border-indigo-500/30 transition-colors">
        {icon}
      </div>
      <h3 className="font-display text-sm font-semibold text-slate-200 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}
