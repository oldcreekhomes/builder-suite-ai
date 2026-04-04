import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_INPUTS, ApartmentInputs } from "@/lib/apartmentCalculations";
import ApartmentsList from "@/components/apartments/ApartmentsList";
import ApartmentDetail from "@/components/apartments/ApartmentDetail";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProFormaRow {
  id: string;
  name: string;
  inputs: ApartmentInputs;
  created_at: string;
  updated_at: string;
}

function mergeInputs(raw: unknown): ApartmentInputs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_INPUTS };
  return { ...DEFAULT_INPUTS, ...(raw as Partial<ApartmentInputs>) };
}

function useEffectiveOwnerId() {
  const { data, isLoading } = useQuery({
    queryKey: ["effective-owner-id"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase
        .from("users")
        .select("role, home_builder_id")
        .eq("id", user.id)
        .single();
      if (!profile) return user.id;
      return profile.role === "owner" ? user.id : (profile.home_builder_id ?? user.id);
    },
  });
  return { effectiveOwnerId: data ?? null, isLoading };
}

export default function Apartments() {
  const { toast } = useToast();
  const { effectiveOwnerId, isLoading: ownerLoading } = useEffectiveOwnerId();
  const [items, setItems] = useState<ProFormaRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProFormaName, setNewProFormaName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchItems = async () => {
    if (!effectiveOwnerId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("apartment_pro_formas")
      .select("*")
      .eq("owner_id", effectiveOwnerId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching pro formas:", error);
    } else {
      setItems((data || []).map((d) => ({
        id: d.id,
        name: d.name,
        inputs: mergeInputs(d.inputs),
        created_at: d.created_at,
        updated_at: d.updated_at,
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!ownerLoading && effectiveOwnerId) {
      fetchItems();
    }
    if (!ownerLoading && !effectiveOwnerId) {
      setLoading(false);
    }
  }, [effectiveOwnerId, ownerLoading]);

  const handleCreate = () => {
    if (!effectiveOwnerId) return;
    setNewProFormaName("");
    setCreateDialogOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (!effectiveOwnerId) return;
    const name = newProFormaName.trim();
    if (!name) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("apartment_pro_formas")
      .insert({ owner_id: effectiveOwnerId, name, inputs: DEFAULT_INPUTS as any })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      setCreateDialogOpen(false);
      setNewProFormaName("");
      await fetchItems();
      setSelectedId(data.id);
    }
    setCreating(false);
  };

  const handleSave = async (inputs: ApartmentInputs) => {
    if (!selectedId) return;
    setSaving(true);
    const { error } = await supabase
      .from("apartment_pro_formas")
      .update({ inputs: inputs as any })
      .eq("id", selectedId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Pro forma saved successfully." });
      await fetchItems();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this pro forma?")) return;
    const { error } = await supabase
      .from("apartment_pro_formas")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      if (selectedId === id) setSelectedId(null);
      await fetchItems();
    }
  };

  if (ownerLoading || loading) {
    return <div className="p-6">Loading...</div>;
  }

  const selected = items.find(i => i.id === selectedId);

  if (selected) {
    return (
      <div className="p-6">
        <ErrorBoundary>
          <ApartmentDetail
            name={selected.name}
            inputs={selected.inputs}
            onSave={handleSave}
            onBack={() => setSelectedId(null)}
            saving={saving}
          />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <>
      <div className="p-6">
        <ApartmentsList
          items={items}
          onSelect={setSelectedId}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />
      </div>

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setNewProFormaName("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new pro forma</DialogTitle>
            <DialogDescription>
              Enter a name to save and organize this apartment analysis.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => { event.preventDefault(); void handleCreateSubmit(); }}
          >
            <Input
              autoFocus
              placeholder="e.g. 923 17th Street South"
              value={newProFormaName}
              onChange={(event) => setNewProFormaName(event.target.value)}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newProFormaName.trim()}>
                {creating ? "Creating..." : "Create pro forma"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
