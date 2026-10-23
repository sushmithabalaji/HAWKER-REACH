import { createBrowserRouter, RouterProvider, NavLink, Outlet } from 'react-router';
import { useState } from 'react';
import { Button, Sheet, SheetContent, SheetHeader, SheetTitle, useIsMobile } from '@databricks/appkit-ui/react';
import { Menu } from 'lucide-react';
import { AssumptionsPanel } from '@/components/shared/AssumptionsPanel';
import { pages } from './pages/registry';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

function NavLinks({ onClick }: { onClick?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {pages.map((page) => (
        <NavLink key={page.path} to={page.path} end className={navLinkClass} onClick={onClick}>
          {page.label}
        </NavLink>
      ))}
    </nav>
  );
}

function Layout() {
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar on desktop */}
      <aside className="hidden md:block w-56 shrink-0 border-r px-3 py-4">
        <h1 className="px-3 mb-4 text-lg font-semibold text-foreground">HawkerReach</h1>
        <NavLinks />
      </aside>

      {/* Header with a slide-out menu on mobile */}
      <header className="md:hidden border-b px-4 py-3 flex items-center">
        <h1 className="text-lg font-semibold text-foreground">HawkerReach</h1>
        <div className="ml-auto">
          {/* Gate on isMobile so the portaled sheet can't linger on desktop
              (replaces a set-state-in-effect reset). */}
          <Sheet open={mobileNavOpen && isMobile} onOpenChange={setMobileNavOpen}>
            <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(true)}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation</span>
            </Button>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <NavLinks onClick={() => setMobileNavOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: pages.map((page) => ({
      path: page.path,
      element: (
        <>
          {page.element}
          <AssumptionsPanel lines={page.assumptions} />
        </>
      ),
    })),
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
