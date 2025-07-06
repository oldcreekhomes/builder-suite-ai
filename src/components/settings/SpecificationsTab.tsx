
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit } from 'lucide-react';
import { BulkActionBar } from './BulkActionBar';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface SpecificationsTabProps {
  specifications: CostCode[];
  loading: boolean;
  selectedSpecifications: Set<string>;
  onSpecificationSelect: (specId: string, checked: boolean) => void;
  onSelectAllSpecifications: (checked: boolean) => void;
  onBulkDeleteSpecifications: () => void;
  onEditSpecification: (costCode: CostCode) => void;
}

export function SpecificationsTab({
  specifications,
  loading,
  selectedSpecifications,
  onSpecificationSelect,
  onSelectAllSpecifications,
  onBulkDeleteSpecifications,
  onEditSpecification
}: SpecificationsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-black">Specifications</h3>
          <p className="text-sm text-gray-600">Manage your project specifications and requirements</p>
          {selectedSpecifications.size > 0 && (
            <p className="text-sm text-gray-600">
              {selectedSpecifications.size} item{selectedSpecifications.size !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <BulkActionBar
            selectedCount={selectedSpecifications.size}
            onBulkDelete={onBulkDeleteSpecifications}
            label="specifications"
          />
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Specification
          </Button>
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="h-10">
              <TableHead className="font-bold py-2 text-sm w-12">
                <Checkbox
                  checked={selectedSpecifications.size === specifications.length && specifications.length > 0}
                  onCheckedChange={onSelectAllSpecifications}
                  ref={(el) => {
                    if (el && 'indeterminate' in el) {
                      (el as any).indeterminate = selectedSpecifications.size > 0 && selectedSpecifications.size < specifications.length;
                    }
                  }}
                />
              </TableHead>
              <TableHead className="font-bold py-2 text-sm">Code</TableHead>
              <TableHead className="font-bold py-2 text-sm">Name</TableHead>
              <TableHead className="font-bold py-2 text-sm">Category</TableHead>
              <TableHead className="font-bold py-2 text-sm">Unit of Measure</TableHead>
              <TableHead className="font-bold py-2 text-sm">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  Loading specifications...
                </TableCell>
              </TableRow>
            ) : specifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                  No cost codes with specifications found. Enable specifications on cost codes to see them here.
                </TableCell>
              </TableRow>
            ) : (
              specifications.map((spec) => (
                <TableRow key={spec.id} className="h-8">
                  <TableCell className="py-1">
                    <Checkbox
                      checked={selectedSpecifications.has(spec.id)}
                      onCheckedChange={(checked) => 
                        onSpecificationSelect(spec.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium py-1 text-sm">{spec.code}</TableCell>
                  <TableCell className="py-1 text-sm">{spec.name}</TableCell>
                  <TableCell className="py-1 text-sm">{spec.category || 'Uncategorized'}</TableCell>
                  <TableCell className="py-1 text-sm">{spec.unit_of_measure || 'N/A'}</TableCell>
                  <TableCell className="py-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onEditSpecification(spec)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
