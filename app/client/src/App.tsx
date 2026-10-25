import { createBrowserRouter, RouterProvider, NavLink, Navigate, Outlet, useLocation } from 'react-router';
import { AssumptionsPanel } from '@/components/shared/AssumptionsPanel';
import { GeoDataProvider } from '@/components/shared/GeoData';
import { pages } from './pages/registry';

// One segmented control for the pages (#114): a single track, the current page filled in.
const tabClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
    isActive
      ? 'bg-card font-semibold text-foreground shadow-sm'
      : 'text-topbar-foreground hover:bg-topbar-foreground/15 hover:text-topbar-strong'
  }`;

// HawkerReach's mark (#119): a hawker bowl with steam, white on the brand orange, at the right of the top bar.
function HawkerReachMark() {
  return (
    <span
      className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand"
      role="img"
      aria-label="HawkerReach"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M3.5 12.5h17a8.5 8.5 0 0 1-17 0Z" fill="#ffffff" stroke="none" />
        <path d="M8 4.5c-1 1.2 1 2 0 3.2M12 3.5c-1 1.2 1 2 0 3.2M16 4.5c-1 1.2 1 2 0 3.2" />
      </svg>
    </span>
  );
}

// The shell: a full-width warm brown bar, edged in the brand orange, with the app name and one tab per
// registered page (wrapping on a phone), then the page centred up to 1440px on the cream background (#113).
function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2.5 border-b-4 border-brand bg-topbar px-4 py-3 text-topbar-strong sm:px-8">
        <h1 className="text-xl font-bold tracking-tight">
          Hawker<span className="text-brand-gold">Reach</span>
        </h1>
        <nav aria-label="Pages" className="flex flex-wrap gap-1 rounded-lg bg-topbar-foreground/10 p-1">
          {pages.map((page) => (
            <NavLink key={page.path} to={page.path} end className={tabClass}>
              {page.label}
            </NavLink>
          ))}
        </nav>
        <HawkerReachMark />
      </header>

      <main className="relative mx-auto flex w-full max-w-[1440px] flex-col gap-3.5 px-4 py-panel sm:px-8">
        <GeoDataProvider>
          <Pages />
          {/* Renders nothing on a page's path; on "/" or an unknown path it redirects to the first page. */}
          <Outlet />
        </GeoDataProvider>
      </main>
    </div>
  );
}

// Every page stays mounted (#114), so switching tabs keeps its loaded data, map and choices instead of
// re-running its queries. The route only picks which page shows; a hidden page is inert and takes no space,
// but keeps its size so its map needs no re-layout when it comes back.
function Pages() {
  // "/closures/" matches the /closures route too, so compare without a trailing slash.
  const pathname = useLocation().pathname.replace(/(.)\/+$/, '$1');
  return pages.map((page) => {
    const active = pathname === page.path;
    return (
      <div
        key={page.path}
        inert={!active}
        aria-hidden={!active}
        className={
          active
            ? 'flex flex-col gap-3.5'
            : 'pointer-events-none invisible absolute inset-x-0 top-0 -z-10 h-0 overflow-hidden'
        }
      >
        {page.element}
        <AssumptionsPanel lines={page.assumptions} />
      </div>
    );
  });
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      // The pages render in Layout, so each route only names its path.
      ...pages.map((page) => ({ path: page.path, element: null })),
      // "/" and any unknown path go to the first page.
      { path: '*', element: <Navigate to={pages[0].path} replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
