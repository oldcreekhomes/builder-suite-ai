import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GridCell {
  value: string | number;
  type: 'text' | 'number' | 'currency' | 'date';
}

interface GridRow {
  id: string;
  cells: GridCell[];
}

interface AccountingGridProps {
  data: any[];
  onDataChange: (data: any[]) => void;
  sheetName: string;
}

const COLUMN_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
const DEFAULT_COLUMNS = 10;
const DEFAULT_ROWS = 20;

export function AccountingGrid({ data, onDataChange, sheetName }: AccountingGridProps) {
  const [gridData, setGridData] = useState<GridRow[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);

  // Initialize grid data
  useEffect(() => {
    if (data.length === 0) {
      const initialData: GridRow[] = Array.from({ length: DEFAULT_ROWS }, (_, rowIndex) => ({
        id: `row-${rowIndex}`,
        cells: Array.from({ length: DEFAULT_COLUMNS }, () => ({
          value: '',
          type: 'text' as const
        }))
      }));
      setGridData(initialData);
    } else {
      setGridData(data);
    }
  }, [data]);

  const updateCell = useCallback((rowIndex: number, colIndex: number, value: string | number, type?: 'text' | 'number' | 'currency' | 'date') => {
    const newData = [...gridData];
    if (!newData[rowIndex]) return;
    
    newData[rowIndex].cells[colIndex] = {
      value,
      type: type || newData[rowIndex].cells[colIndex].type
    };
    
    setGridData(newData);
    onDataChange(newData);
  }, [gridData, onDataChange]);

  const addRow = () => {
    const newRow: GridRow = {
      id: `row-${gridData.length}`,
      cells: Array.from({ length: DEFAULT_COLUMNS }, () => ({
        value: '',
        type: 'text' as const
      }))
    };
    const newData = [...gridData, newRow];
    setGridData(newData);
    onDataChange(newData);
  };

  const deleteRow = (rowIndex: number) => {
    if (gridData.length <= 1) return;
    const newData = gridData.filter((_, index) => index !== rowIndex);
    setGridData(newData);
    onDataChange(newData);
  };

  const addColumn = () => {
    const newData = gridData.map(row => ({
      ...row,
      cells: [...row.cells, { value: '', type: 'text' as const }]
    }));
    setGridData(newData);
    onDataChange(newData);
  };

  const exportToCSV = () => {
    const csvContent = gridData.map(row => 
      row.cells.map(cell => `"${cell.value}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sheetName}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCellValue = (cell: GridCell) => {
    if (cell.type === 'currency' && typeof cell.value === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(cell.value);
    }
    return cell.value?.toString() || '';
  };

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    setSelectedCell({ row: rowIndex, col: colIndex });
    setEditingCell(null);
  };

  const handleCellDoubleClick = (rowIndex: number, colIndex: number) => {
    setEditingCell({ row: rowIndex, col: colIndex });
    setSelectedCell({ row: rowIndex, col: colIndex });
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    if (e.key === 'Enter') {
      setEditingCell(null);
      if (rowIndex < gridData.length - 1) {
        setSelectedCell({ row: rowIndex + 1, col: colIndex });
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setEditingCell(null);
      if (colIndex < gridData[0]?.cells.length - 1) {
        setSelectedCell({ row: rowIndex, col: colIndex + 1 });
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const numColumns = gridData[0]?.cells.length || DEFAULT_COLUMNS;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>
        <Button variant="outline" size="sm" onClick={addColumn}>
          <Plus className="h-4 w-4 mr-2" />
          Add Column
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-full">
          {/* Column Headers */}
          <div className="flex sticky top-0 bg-muted z-10">
            <div className="w-12 h-8 border-r border-b border-border bg-muted flex items-center justify-center text-xs font-medium">
              #
            </div>
            {Array.from({ length: numColumns }, (_, colIndex) => (
              <div
                key={colIndex}
                className="w-24 h-8 border-r border-b border-border bg-muted flex items-center justify-center text-xs font-medium"
              >
                {COLUMN_LABELS[colIndex] || `Col${colIndex + 1}`}
              </div>
            ))}
          </div>

          {/* Grid Rows */}
          {gridData.map((row, rowIndex) => (
            <div key={row.id} className="flex group">
              {/* Row Number */}
              <div className="w-12 h-8 border-r border-b border-border bg-muted/50 flex items-center justify-center text-xs font-medium">
                <span>{rowIndex + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-4 h-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                  onClick={() => deleteRow(rowIndex)}
                  disabled={gridData.length <= 1}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {/* Cells */}
              {row.cells.map((cell, colIndex) => {
                const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;

                return (
                  <div
                    key={colIndex}
                    className={cn(
                      "w-24 h-8 border-r border-b border-border bg-background cursor-cell relative",
                      isSelected && "ring-2 ring-primary ring-inset",
                      "hover:bg-muted/50"
                    )}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                  >
                    {isEditing ? (
                      <Input
                        className="w-full h-full border-0 rounded-none focus:ring-0 focus:ring-offset-0 p-1 text-xs"
                        value={cell.value?.toString() || ''}
                        onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                        onKeyDown={(e) => handleCellKeyDown(e, rowIndex, colIndex)}
                        onBlur={() => setEditingCell(null)}
                        autoFocus
                      />
                    ) : (
                      <div className="w-full h-full flex items-center px-1 text-xs overflow-hidden">
                        {formatCellValue(cell)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Cell Type Selector */}
      {selectedCell && (
        <div className="p-2 border-t bg-muted/30 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Cell Type:</span>
          <Select
            value={gridData[selectedCell.row]?.cells[selectedCell.col]?.type || 'text'}
            onValueChange={(value: 'text' | 'number' | 'currency' | 'date') => {
              updateCell(selectedCell.row, selectedCell.col, 
                gridData[selectedCell.row]?.cells[selectedCell.col]?.value || '', value);
            }}
          >
            <SelectTrigger className="w-32 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="currency">Currency</SelectItem>
              <SelectItem value="date">Date</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-4">
            Selected: {COLUMN_LABELS[selectedCell.col]}{selectedCell.row + 1}
          </span>
        </div>
      )}
    </div>
  );
}