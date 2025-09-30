
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";

type CostCode = Tables<'cost_codes'>;

interface EditCostCodeDialogProps {
  costCode: CostCode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCostCodes: Array<{ code: string; name: string; }>;
  onUpdateCostCode: (costCodeId: string, updatedCostCode: any) => void;
}

export function EditCostCodeDialog({ 
  costCode, 
  open, 
  onOpenChange, 
  existingCostCodes, 
  onUpdateCostCode 
}: EditCostCodeDialogProps) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    parent_group: "",
    quantity: "",
    price: "",
    unit_of_measure: "",
    has_specifications: "",
    has_bidding: "",
    has_subcategories: "",
  });

  useEffect(() => {
    if (costCode) {
      setFormData({
        code: costCode.code,
        name: costCode.name,
        parent_group: costCode.parent_group || "none",
        quantity: costCode.quantity || "",
        price: costCode.price?.toString() || "",
        unit_of_measure: costCode.unit_of_measure || "",
        has_specifications: costCode.has_specifications ? "yes" : "no",
        has_bidding: costCode.has_bidding ? "yes" : "no",
        has_subcategories: costCode.has_subcategories ? "yes" : "no",
      });
    }
  }, [costCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (costCode) {
      const updatedData = {
        ...formData,
        parent_group: formData.parent_group === "none" ? null : formData.parent_group
      };
      onUpdateCostCode(costCode.id, updatedData);
      onOpenChange(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Cost Code</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Row 1 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Cost Code *</Label>
                <Input
                  id="code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleInputChange("code", e.target.value)}
                  placeholder="Enter cost code number"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter cost code name"
                  required
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parent_group">Parent Group</Label>
                <Select value={formData.parent_group} onValueChange={(value) => handleInputChange("parent_group", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {existingCostCodes.map((costCode) => (
                      <SelectItem key={costCode.code} value={costCode.code}>
                        {costCode.code} - {costCode.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  placeholder="Enter quantity"
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange("price", e.target.value)}
                  placeholder="Enter price"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="unit_of_measure">Unit of Measure</Label>
                <Select value={formData.unit_of_measure} onValueChange={(value) => handleInputChange("unit_of_measure", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit of measure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="each">Each</SelectItem>
                    <SelectItem value="square-feet">Square Feet</SelectItem>
                    <SelectItem value="linear-feet">Linear Feet</SelectItem>
                    <SelectItem value="square-yard">Square Yard</SelectItem>
                    <SelectItem value="cubic-yard">Cubic Yard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="has_specifications">Has Specifications</Label>
                <Select value={formData.has_specifications} onValueChange={(value) => handleInputChange("has_specifications", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="has_bidding">Has Bidding</Label>
                <Select value={formData.has_bidding} onValueChange={(value) => handleInputChange("has_bidding", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 5: Sub Categories with Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="has_subcategories">Has Sub Categories</Label>
                <Select value={formData.has_subcategories} onValueChange={(value) => handleInputChange("has_subcategories", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Buttons */}
              <div className="space-y-2">
                <Label className="invisible">Actions</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">Update Cost Code</Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
