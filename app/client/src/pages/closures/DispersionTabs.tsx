import { Tabs, TabsContent, TabsList, TabsTrigger } from '@databricks/appkit-ui/react';
import type { PlanResult } from '@shared/closure-engine';
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/shared/Panel';
import { DemandWasteTab } from './DemandWasteTab';

// Below the headline numbers: demand and waste per centre, and centres to schedule alongside (Spec 4).
export function DispersionTabs({ result, placeholder }: { result: PlanResult | null; placeholder: string }) {
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
            <p className="text-sm text-muted-foreground">Centres to schedule alongside come with Spec 4.5.</p>
          </TabsContent>
        </Tabs>
      </PanelContent>
    </Panel>
  );
}
