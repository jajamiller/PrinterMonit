import type { ReactNode } from 'react';

type PageTitleIcon = 'dashboard' | 'printer' | 'history' | 'users' | 'reports' | 'monitoring';

const iconPaths: Record<PageTitleIcon, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></>,
  printer: <><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v7H7zM17 11h.01"/></>,
  history: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6"/></>,
  reports: <><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/><path d="M17 6h3v3"/></>,
  monitoring: <><path d="M3 12h4l3-8 4 16 3-8h4"/><circle cx="12" cy="12" r="9"/></>,
};

export function PageTitle({ icon, children }: { icon: PageTitleIcon; children: string }) {
  return (
    <h1 className="page-title">
      <span className="page-title-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{iconPaths[icon]}</svg>
      </span>
      {children}
    </h1>
  );
}
