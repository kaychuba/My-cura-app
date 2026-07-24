import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';
import type { MarketingItem } from '../marketingData';

interface TabbedShowcaseProps {
  id: string;
  /** Hash prefix for deep links: `#<hashPrefix>-<slug>` activates that tab. */
  hashPrefix: string;
  heading: string;
  subheading: string;
  items: MarketingItem[];
  tone?: 'plain' | 'tinted';
}

/**
 * OneTouch-style section where every item has its own tab on the page:
 * the nav dropdowns deep-link to `#<hashPrefix>-<slug>`, which scrolls here
 * (hidden anchors below) and switches to the matching tab — no page change.
 */
export function TabbedShowcase({
  id,
  hashPrefix,
  heading,
  subheading,
  items,
  tone = 'plain',
}: TabbedShowcaseProps) {
  const { hash } = useLocation();
  const [active, setActive] = useState(items[0].slug);

  useEffect(() => {
    const match = hash.startsWith(`#${hashPrefix}-`) ? hash.slice(hashPrefix.length + 2) : null;
    if (match && items.some((item) => item.slug === match)) setActive(match);
  }, [hash, hashPrefix, items]);

  const current = items.find((item) => item.slug === active) ?? items[0];
  const Icon = current.icon;

  return (
    <section
      id={id}
      className={`scroll-mt-20 ${
        tone === 'tinted'
          ? 'bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-700'
          : ''
      }`}
    >
      {/* Deep-link anchors: scrolling to any item lands at the section top. */}
      {items.map((item) => (
        <span key={item.slug} id={`${hashPrefix}-${item.slug}`} aria-hidden="true" />
      ))}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{heading}</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">{subheading}</p>
        </div>

        {/* Tab bar */}
        <div
          role="tablist"
          aria-label={heading}
          className="flex flex-wrap justify-center gap-2 mb-8"
        >
          {items.map((item) => (
            <button
              key={item.slug}
              role="tab"
              aria-selected={item.slug === active}
              onClick={() => {
                setActive(item.slug);
                // Keep the URL shareable without re-triggering scroll handling.
                window.history.replaceState(null, '', `#${hashPrefix}-${item.slug}`);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                item.slug === active
                  ? 'bg-primary-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {item.title}
            </button>
          ))}
        </div>

        {/* Active panel */}
        <div role="tabpanel" className="card p-8 sm:p-10 max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-8">
            <div className="flex-1">
              <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-primary-500 dark:text-primary-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {current.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-300">{current.body}</p>
              <Link
                to="/contact?type=demo"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-300 hover:underline mt-4"
              >
                See it in a demo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <ul className="flex-1 space-y-3 sm:pt-2">
              {current.highlights.map((highlight) => (
                <li
                  key={highlight}
                  className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300"
                >
                  <CheckCircle className="w-4 h-4 text-accent-500 flex-shrink-0 mt-0.5" />
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
