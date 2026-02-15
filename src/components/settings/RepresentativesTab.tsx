import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { RepresentativesTable } from "@/components/representatives/RepresentativesTable";
import { AddRepresentativeModal } from "@/components/representatives/AddRepresentativeModal";

export function RepresentativesTab() {
  const [addRepresentativeOpen, setAddRepresentativeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-black">Representatives</h3>
          <p className="text-sm text-gray-600">Manage your company representatives</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAddRepresentativeOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Representative
          </Button>
        </div>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <RepresentativesTable searchQuery={searchQuery} />

      <AddRepresentativeModal open={addRepresentativeOpen} onOpenChange={setAddRepresentativeOpen} />
    </div>
  );
}
