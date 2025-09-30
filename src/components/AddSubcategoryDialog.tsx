import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddSubcategoryDialogProps {
  parentCode: string;
  parentName: string;
  onAddCostCode: (costCode: any) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSubcategoryDialog({ parentCode, parentName, onAddCostCode, open, onOpenChange }: AddSubcategoryDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    price: "",
    unitOfMeasure: "",
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: "",
        quantity: "",
        price: "",
        unitOfMeasure: "",
      });
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Auto-set parent_group, has_subcategories, and other defaults
    const submissionData = {
      ...formData,
      code: "", // Will be auto-generated
      parentGroup: parentCode,
      hasSubcategories: "no", // Subcategories are always the lowest level
      hasSpecifications: "no",
      hasBidding: "no",
    };
    onAddCostCode(submissionData);
    onOpenChange(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Subcategory to {parentCode} {parentName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter subcategory name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  placeholder="Enter quantity"
                />
              </div>

              {/* Price */}
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
            </div>

            {/* Unit of Measure */}
            <div className="space-y-2">
              <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
              <Select value={formData.unitOfMeasure} onValueChange={(value) => handleInputChange("unitOfMeasure", value)}>
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

            {/* Buttons */}
            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Subcategory</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
