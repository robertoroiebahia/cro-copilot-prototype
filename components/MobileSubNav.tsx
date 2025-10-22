'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileSubNav() {
  const pathname = usePathname();

  // Determine which sub-nav to show based on current path
  const getSubNavItems = () => {
    // Research/Analysis pages
    if (pathname?.startsWith('/analyze') || pathname === '/analyses') {
      return {
        label: 'Research',
        items: [
          { label: 'All', href: '/analyses' },
          { label: 'Page', href: '/analyze' },
          { label: 'GA4', href: '/analyze/ga' },
          { label: 'Surveys', href: '/analyze/survey' },
          { label: 'Reviews', href: '/analyze/review-mining' },
          { label: 'Polls', href: '/analyze/onsite-poll' },
        ],
      };
    }

    // Insights & Strategy pages
    if (
      pathname === '/insights' ||
      pathname === '/themes' ||
      pathname === '/hypotheses' ||
      pathname === '/experiments'
    ) {
      return {
        label: 'Strategy',
        items: [
          { label: 'Insights', href: '/insights' },
          { label: 'Themes', href: '/themes' },
          { label: 'Hypotheses', href: '/hypotheses' },
          { label: 'Experiments', href: '/experiments' },
        ],
      };
    }

    // Results page - show related analyses
    if (pathname?.startsWith('/dashboard/results/')) {
      return {
        label: 'Results',
        items: [
          { label: 'Overview', href: '#overview' },
          { label: 'Insights', href: '#insights' },
          { label: 'Actions', href: '#actions' },
        ],
      };
    }

    return null;
  };

  const subNav = getSubNavItems();

  if (!subNav) return null;

  return (
    <div className="lg:hidden sticky top-14 z-40 bg-white overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-6 px-4 min-w-max border-b-2 border-black">
        {subNav.items.map((item) => {
          // Exact match for active state - no startsWith to avoid overlaps
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative py-3 text-sm font-bold whitespace-nowrap"
              style={{
                color: isActive ? '#F5C542' : '#0E0E0E',
              }}
            >
              {item.label}
              {/* Gold underline (4px thick) for active state */}
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0"
                  style={{
                    height: '4px',
                    backgroundColor: '#F5C542'
                  }}
                ></div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
