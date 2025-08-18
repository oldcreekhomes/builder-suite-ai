import React, { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Plus, X, Edit2 } from 'lucide-react';
import { AccountingGrid } from './AccountingGrid';

interface Sheet {
  id: string;
  name: string;
  data: any[];
}

const DEFAULT_SHEETS: Sheet[] = [
  { id: 'sheet1', name: 'Sheet 1', data: [] },
  { id: 'sheet2', name: 'Sheet 2', data: [] },
  { id: 'sheet3', name: 'Sheet 3', data: [] }
];

export function AccountingTabs() {
  const [sheets, setSheets] = useState<Sheet[]>(() => {
    const saved = localStorage.getItem('accounting-sheets');
    return saved ? JSON.parse(saved) : DEFAULT_SHEETS;
  });
  
  const [activeTab, setActiveTab] = useState(sheets[0]?.id || '');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const [editingSheet, setEditingSheet] = useState<string | null>(null);

  const saveSheets = useCallback((updatedSheets: Sheet[]) => {
    localStorage.setItem('accounting-sheets', JSON.stringify(updatedSheets));
    setSheets(updatedSheets);
  }, []);

  const addSheet = () => {
    if (!newSheetName.trim()) return;
    
    const newSheet: Sheet = {
      id: `sheet-${Date.now()}`,
      name: newSheetName.trim(),
      data: []
    };
    
    const updatedSheets = [...sheets, newSheet];
    saveSheets(updatedSheets);
    setActiveTab(newSheet.id);
    setNewSheetName('');
    setShowAddDialog(false);
  };

  const renameSheet = () => {
    if (!newSheetName.trim() || !editingSheet) return;
    
    const updatedSheets = sheets.map(sheet =>
      sheet.id === editingSheet ? { ...sheet, name: newSheetName.trim() } : sheet
    );
    
    saveSheets(updatedSheets);
    setNewSheetName('');
    setEditingSheet(null);
    setShowRenameDialog(false);
  };

  const deleteSheet = () => {
    if (!editingSheet || sheets.length <= 1) return;
    
    const updatedSheets = sheets.filter(sheet => sheet.id !== editingSheet);
    saveSheets(updatedSheets);
    
    if (activeTab === editingSheet) {
      setActiveTab(updatedSheets[0]?.id || '');
    }
    
    setEditingSheet(null);
    setShowDeleteDialog(false);
  };

  const updateSheetData = useCallback((sheetId: string, data: any[]) => {
    const updatedSheets = sheets.map(sheet =>
      sheet.id === sheetId ? { ...sheet, data } : sheet
    );
    saveSheets(updatedSheets);
  }, [sheets, saveSheets]);

  const currentSheet = sheets.find(sheet => sheet.id === activeTab);

  return (
    <div className="w-full h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between border-b bg-background px-4 py-2">
          <TabsList className="h-auto p-0 bg-transparent">
            {sheets.map((sheet) => (
              <div key={sheet.id} className="flex items-center group">
                <TabsTrigger 
                  value={sheet.id}
                  className="relative px-4 py-2 data-[state=active]:bg-muted"
                >
                  {sheet.name}
                </TabsTrigger>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setEditingSheet(sheet.id);
                      setNewSheetName(sheet.name);
                      setShowRenameDialog(true);
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  {sheets.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => {
                        setEditingSheet(sheet.id);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </TabsList>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Sheet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Sheet</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Sheet name"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSheet()}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addSheet} disabled={!newSheetName.trim()}>
                    Add Sheet
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {sheets.map((sheet) => (
          <TabsContent key={sheet.id} value={sheet.id} className="flex-1 mt-0 p-0">
            <AccountingGrid
              data={sheet.data}
              onDataChange={(data) => updateSheetData(sheet.id, data)}
              sheetName={sheet.name}
            />
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Sheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Sheet name"
              value={newSheetName}
              onChange={(e) => setNewSheetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && renameSheet()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
                Cancel
              </Button>
              <Button onClick={renameSheet} disabled={!newSheetName.trim()}>
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Sheet"
        description={`Are you sure you want to delete "${sheets.find(s => s.id === editingSheet)?.name}"? This action cannot be undone.`}
        onConfirm={deleteSheet}
      />
    </div>
  );
}