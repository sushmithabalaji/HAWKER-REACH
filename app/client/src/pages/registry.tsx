import type { ReactNode } from 'react';
import type { AssumptionLine } from '@shared/assumptions';
import { HomePage } from './home/HomePage';
import { homeAssumptions } from './home/assumptions';

export interface PageEntry {
  path: string;
  label: string;
  element: ReactNode;
  // Lines for this page's Assumptions panel. Each page registers only its own.
  assumptions: AssumptionLine[];
}

// Adding a page is one entry here: it gets a route, a sidebar link and an Assumptions panel.
export const pages: PageEntry[] = [{ path: '/', label: 'Home', element: <HomePage />, assumptions: homeAssumptions }];
