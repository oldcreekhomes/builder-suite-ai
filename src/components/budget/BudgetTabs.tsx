import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BudgetTable } from './BudgetTable';
import { ActualTable } from './ActualTable';

interface BudgetTabsProps {
  projectId: string;
  projectAddress?: string;
}

export function BudgetTabs({ projectId, projectAddress }: BudgetTabsProps) {
  return (
    <Tabs defaultValue="budget" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="budget">Budget</TabsTrigger>
        <TabsTrigger value="actual">Actual</TabsTrigger>
      </TabsList>
      
      <TabsContent value="budget" className="mt-6">
        <BudgetTable projectId={projectId} projectAddress={projectAddress} />
      </TabsContent>
      
      <TabsContent value="actual" className="mt-6">
        <ActualTable projectId={projectId} projectAddress={projectAddress} />
      </TabsContent>
    </Tabs>
  );
}