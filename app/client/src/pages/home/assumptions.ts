import type { AssumptionLine } from '@shared/assumptions';

export const homeAssumptions: AssumptionLine[] = [
  {
    text: 'Blocks: distinct HDB blocks in gold.block_access',
    tag: 'MEASURED',
    source: 'HDB Property Information and building footprints (data.gov.sg, 2026-10-17), matched in 02_silver',
    status: 'sourced',
  },
];
