import { createBrowserRouter, RouterProvider, NavLink, Navigate, Outlet } from 'react-router';
import { AssumptionsPanel } from '@/components/shared/AssumptionsPanel';
import { GeoDataProvider } from '@/components/shared/GeoData';
import { pages } from './pages/registry';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3.5 py-2.5 text-sm transition-colors ${
    isActive ? 'bg-card font-semibold text-foreground' : 'text-topbar-foreground hover:bg-topbar-foreground/10'
  }`;

// The shell: a full-width chocolate-brown bar, edged in the brand orange, with the app name and one tab per
// registered page (wrapping on a phone), then the page centred up to 1440px on the cream background (#113).
function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2.5 border-b-4 border-brand bg-topbar px-4 py-3 text-topbar-strong sm:px-8">
        <h1 className="text-xl font-bold tracking-tight">
          Hawker<span className="text-brand">Reach</span>
        </h1>
        <nav aria-label="Pages" className="flex flex-wrap gap-1">
          {pages.map((page) => (
            <NavLink key={page.path} to={page.path} end className={tabClass}>
              {page.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-3.5 px-4 py-panel sm:px-8">
        <GeoDataProvider>
          <Outlet />
        </GeoDataProvider>
      </main>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      ...pages.map((page) => ({
        path: page.path,
        element: (
          <>
            {page.element}
            <AssumptionsPanel lines={page.assumptions} />
          </>
        ),
      })),
      // "/" and any unknown path go to the first page.
      { path: '*', element: <Navigate to={pages[0].path} replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
