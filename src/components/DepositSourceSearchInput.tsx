import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useDepositSources } from "@/hooks/useDepositSources";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddDepositSourceDialog } from "./AddDepositSourceDialog";

interface DepositSourceSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSourceSelect: (sourceId: string, sourceName: string) => void;
  placeholder?: string;
  className?: string;
}

export function DepositSourceSearchInput({
  value,
  onChange,
  onSourceSelect,
  placeholder = "Search deposit sources...",
  className,
}: DepositSourceSearchInputProps) {
  const { searchDepositSources, loading } = useDepositSources();
  const [searchQuery, setSearchQuery] = useState(value);
  const [showResults, setShowResults] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
    setShowResults(true);
  };

  const handleSelectSource = (sourceId: string, sourceName: string) => {
    setSearchQuery(sourceName);
    setShowResults(false);
    onSourceSelect(sourceId, sourceName);
  };

  const handleAddNew = (sourceId: string, sourceName: string) => {
    setSearchQuery(sourceName);
    setShowResults(false);
    onSourceSelect(sourceId, sourceName);
    setShowAddDialog(false);
  };

  const filteredSources = searchDepositSources(searchQuery);

  return (
    <div className="relative">
      <Input
        type="text"
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={() => setShowResults(true)}
        onBlur={() => setTimeout(() => setShowResults(false), 200)}
        placeholder={placeholder}
        className={className}
      />
      
      {showResults && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="p-2 text-sm text-muted-foreground">Loading...</div>
          ) : filteredSources.length > 0 ? (
            <div>
              {filteredSources.map((source) => (
              <div
                key={source.id}
                onClick={() => handleSelectSource(source.id, source.customer_name)}
                className="p-2 hover:bg-accent cursor-pointer"
              >
                <div className="font-medium">{source.customer_name}</div>
              </div>
              ))}
            </div>
          ) : (
            <div className="p-2">
              <div className="text-sm text-muted-foreground mb-2">No sources found</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setShowResults(false);
                  setShowAddDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Source
              </Button>
            </div>
          )}
        </div>
      )}

      <AddDepositSourceDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSourceAdded={handleAddNew}
        initialName={searchQuery}
      />
    </div>
  );
}
