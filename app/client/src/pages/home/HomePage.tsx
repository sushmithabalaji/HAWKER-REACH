import { Card, CardContent, CardHeader, CardTitle, Skeleton, useAnalyticsQuery } from '@databricks/appkit-ui/react';
import { QueryError } from '@/components/shared/QueryError';
import { TagBadge } from '@/components/shared/TagBadge';
import { MapCheck } from './MapCheck';

export function HomePage() {
  const { data, loading, error } = useAnalyticsQuery('home_gold_check', {});

  return (
    <div className="max-w-4xl mx-auto space-y-6 mt-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2 text-foreground">HawkerReach</h2>
        <p className="text-lg text-muted-foreground">Hawker centre closures and who loses a walkable meal.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Gold table check</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <Skeleton className="h-8 w-1/2" />}
          {error && <QueryError error={error} />}
          {data && data.length > 0 && (
            <p className="text-sm text-muted-foreground">
              <span className="text-2xl font-bold text-primary">{data[0].blocks}</span> blocks in
              hawkerreach.gold.block_access
              <TagBadge tag="MEASURED" />
            </p>
          )}
        </CardContent>
      </Card>

      <MapCheck />
    </div>
  );
}
