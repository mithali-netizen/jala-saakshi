import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Home from './pages/Home';
import Lake from './pages/Lake';
import Tracker from './pages/Tracker';
import Explorer from './pages/Explorer';
import { useData } from '../context/DataContext';
import { APP_NAME } from '../brand';

export type StoryRoute = 'gap' | 'lake' | 'tracker' | 'explorer';

export const STORY_TABS: { id: StoryRoute; hash: string; label: string }[] = [
  { id: 'gap', hash: '#/story', label: 'The gap' },
  { id: 'lake', hash: '#/story/lake', label: 'Doddagubbi' },
  { id: 'tracker', hash: '#/story/tracker', label: 'Tracker' },
  { id: 'explorer', hash: '#/story/explorer', label: 'KSPCB explorer' },
];

export function storyRouteFromHash(hash: string): StoryRoute {
  if (hash.startsWith('#/story/lake')) return 'lake';
  if (hash.startsWith('#/story/tracker')) return 'tracker';
  if (hash.startsWith('#/story/explorer')) return 'explorer';
  return 'gap';
}

/** The long-form pages. Same data context as the dashboard, so the figures match. */
export const StoryApp: React.FC<{ route: StoryRoute }> = ({ route }) => {
  const { isLoading, error } = useData();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-[1000] border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="shell flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3">
          <a href="#/dashboard" className="flex items-center gap-2 text-sm font-semibold text-slate-700 no-underline hover:text-teal-800">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <span className="font-bold text-slate-900">{APP_NAME}</span>
            <span className="hidden text-slate-400 sm:inline">dashboard</span>
          </a>
          <nav aria-label="Story sections" className="-mb-px flex gap-1 overflow-x-auto">
            {STORY_TABS.map((t) => (
              <a
                key={t.id}
                href={t.hash}
                aria-current={route === t.id ? 'page' : undefined}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold no-underline transition-colors ${
                  route === t.id ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="shell flex-1 py-8">
        {isLoading && <div className="h-96 animate-pulse rounded-2xl bg-slate-200/70" />}
        {!isLoading && error && (
          <p className="rounded-2xl border border-rose-200 bg-white p-6 text-sm text-rose-900">{error}</p>
        )}
        {!isLoading && !error && (
          <>
            {route === 'gap' && <Home />}
            {route === 'lake' && <Lake />}
            {route === 'tracker' && <Tracker />}
            {route === 'explorer' && <Explorer />}
          </>
        )}
      </main>

      <footer className="shell pb-10 pt-2 text-xs text-slate-500">
        Source: KSPCB monthly water quality reports. Readings are point-in-time samples. Items marked Demo or News
        coverage are not part of that dataset.
      </footer>
    </div>
  );
};

export default StoryApp;
