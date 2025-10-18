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
  existingCostCodes: Array<{ code: string; parent_group: string | null }>;
  onAddCostCode: (costCode: any) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSubcategoryDialog({ parentCode, parentName, existingCostCodes, onAddCostCode, open, onOpenChange }: AddSubcategoryDialogProps) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    quantity: "",
    price: "",
    unitOfMeasure: "",
    estimate: "",
  });

  // Calculate next available subcategory code
  const calculateNextCode = () => {
    const siblingCodes = existingCostCodes
      .filter(cc => cc.parent_group === parentCode)
      .map(cc => cc.code)
      .filter(code => code.startsWith(parentCode + "."))
      .map(code => {
        const parts = code.split(".");
        return parts.length > 1 ? parseInt(parts[1]) : 0;
      })
      .filter(num => !isNaN(num));
    
    const maxNumber = siblingCodes.length > 0 ? Math.max(...siblingCodes) : 0;
    return `${parentCode}.${maxNumber + 1}`;
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        code: calculateNextCode(),
        name: "",
        quantity: "",
        price: "",
        unitOfMeasure: "",
        estimate: "",
      });
    }
  }, [open, parentCode, existingCostCodes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Auto-set parent_group, has_subcategories, and other defaults
    const submissionData = {
      ...formData,
      parentGroup: parentCode,
      hasSubcategories: "no", // Subcategories are always the lowest level
      hasSpecifications: "no",
      hasBidding: "no",
    };
    onAddCostCode(submissionData);
    // Reset form for next entry instead of closing
    setFormData({
      code: calculateNextCode(),
      name: "",
      quantity: "",
      price: "",
      unitOfMeasure: "",
      estimate: "",
    });
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
            {/* Cost Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Cost Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleInputChange("code", e.target.value)}
                placeholder="Enter cost code"
                required
              />
            </div>

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

            {/* Estimate */}
            <div className="space-y-2">
              <Label htmlFor="estimate">Estimate</Label>
              <Select value={formData.estimate} onValueChange={(value) => handleInputChange("estimate", value)}>
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
