import type { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@databricks/appkit-ui/react';
import type { PlanResult } from '@shared/closure-engine';
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/shared/Panel';
import { DemandWasteTab } from './DemandWasteTab';

// Below the headline numbers: demand and waste per centre, and centres to schedule alongside (Spec 4).
export function DispersionTabs({
  result,
  placeholder,
  schedule,
}: {
  result: PlanResult | null;
  placeholder: string;
  /** The Schedule alongside tab; null until there is an anchor and data. */
  schedule: ReactNode;
}) {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Demand dispersion and waste</PanelTitle>
      </PanelHeader>
      <PanelContent>
        <Tabs defaultValue="demand">
          <TabsList>
            <TabsTrigger value="demand">Demand &amp; waste</TabsTrigger>
            <TabsTrigger value="schedule">Schedule alongside</TabsTrigger>
          </TabsList>
          <TabsContent value="demand" className="pt-3">
            <DemandWasteTab result={result} placeholder={placeholder} />
          </TabsContent>
          <TabsContent value="schedule" className="pt-3">
            {schedule ?? <p className="text-sm text-muted-foreground">{placeholder}</p>}
          </TabsContent>
        </Tabs>
      </PanelContent>
    </Panel>
  );
}
