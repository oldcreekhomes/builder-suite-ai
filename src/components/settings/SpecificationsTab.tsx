
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit } from 'lucide-react';
import { BulkActionBar } from './BulkActionBar';

interface SpecificationsTabProps {
  selectedSpecifications: Set<string>;
  onSpecificationSelect: (specId: string, checked: boolean) => void;
  onSelectAllSpecifications: (checked: boolean) => void;
  onBulkDeleteSpecifications: () => void;
}

const mockSpecs = [
  { id: '1', name: 'Concrete Mix Design', category: 'Foundation' },
  { id: '2', name: 'Framing Lumber', category: 'Framing' },
  { id: '3', name: 'Insulation', category: 'Insulation' }
];

export function SpecificationsTab({
  selectedSpecifications,
  onSpecificationSelect,
  onSelectAllSpecifications,
  onBulkDeleteSpecifications
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
                  checked={selectedSpecifications.size === mockSpecs.length && mockSpecs.length > 0}
                  onCheckedChange={onSelectAllSpecifications}
                  ref={(el) => {
                    if (el && 'indeterminate' in el) {
                      (el as any).indeterminate = selectedSpecifications.size > 0 && selectedSpecifications.size < mockSpecs.length;
                    }
                  }}
                />
              </TableHead>
              <TableHead className="font-bold py-2 text-sm">Specification</TableHead>
              <TableHead className="font-bold py-2 text-sm">Category</TableHead>
              <TableHead className="font-bold py-2 text-sm">Description</TableHead>
              <TableHead className="font-bold py-2 text-sm">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="h-8">
              <TableCell className="py-1">
                <Checkbox
                  checked={selectedSpecifications.has('1')}
                  onCheckedChange={(checked) => 
                    onSpecificationSelect('1', checked as boolean)
                  }
                />
              </TableCell>
              <TableCell className="font-medium py-1 text-sm">Concrete Mix Design</TableCell>
              <TableCell className="py-1 text-sm">Foundation</TableCell>
              <TableCell className="py-1 text-sm">3000 PSI concrete with air entrainment</TableCell>
              <TableCell className="py-1">
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
            <TableRow className="h-8">
              <TableCell className="py-1">
                <Checkbox
                  checked={selectedSpecifications.has('2')}
                  onCheckedChange={(checked) => 
                    onSpecificationSelect('2', checked as boolean)
                  }
                />
              </TableCell>
              <TableCell className="font-medium py-1 text-sm">Framing Lumber</TableCell>
              <TableCell className="py-1 text-sm">Framing</TableCell>
              <TableCell className="py-1 text-sm">Grade A Douglas Fir 2x4, 2x6, 2x8</TableCell>
              <TableCell className="py-1">
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
            <TableRow className="h-8">
              <TableCell className="py-1">
                <Checkbox
                  checked={selectedSpecifications.has('3')}
                  onCheckedChange={(checked) => 
                    onSpecificationSelect('3', checked as boolean)
                  }
                />
              </TableCell>
              <TableCell className="font-medium py-1 text-sm">Insulation</TableCell>
              <TableCell className="py-1 text-sm">Insulation</TableCell>
              <TableCell className="py-1 text-sm">R-15 fiberglass batt insulation</TableCell>
              <TableCell className="py-1">
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
