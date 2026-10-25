import { useMemo } from 'react';
import { useAnalyticsQuery } from '@databricks/appkit-ui/react';
import type { GoldData } from '@shared/closure-engine';
import { NO_PARAMS, type RawRow } from '@/components/shared/queryValues';
import { toGoldData } from './goldRows';

// block_options (~27k rows) is over AppKit's 5 MB limit for one JSON event, so it comes as Arrow.
const ARROW = { format: 'ARROW_STREAM' } as const;
// An Arrow table's row; apache-arrow types toArray() as any.
type ArrowRow = { toJSON(): RawRow };

// The gold rows the closure plan engine runs on, read once per visit through Page 1's SQL files.
export function usePlanData(): { data: GoldData | null; error: string | null } {
  const blockOptions = useAnalyticsQuery('closures_block_options', NO_PARAMS, ARROW);
  const centres = useAnalyticsQuery('closures_centres', NO_PARAMS);
  const centreDemand = useAnalyticsQuery('closures_centre_demand', NO_PARAMS);
  const centreClosures = useAnalyticsQuery('closures_centre_closures', NO_PARAMS);

  const data = useMemo(() => {
    if (!blockOptions.data || !centres.data || !centreDemand.data || !centreClosures.data) return null;
    return toGoldData({
      blockOptions: (blockOptions.data.toArray() as ArrowRow[]).map((row) => row.toJSON()),
      centres: centres.data as RawRow[],
      centreDemand: centreDemand.data as RawRow[],
      centreClosures: centreClosures.data as RawRow[],
    });
  }, [blockOptions.data, centres.data, centreDemand.data, centreClosures.data]);

  return { data, error: blockOptions.error ?? centres.error ?? centreDemand.error ?? centreClosures.error };
}
