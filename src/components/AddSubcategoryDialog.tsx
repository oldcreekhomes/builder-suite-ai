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
  onAddCostCode: (costCode: any) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSubcategoryDialog({ parentCode, onAddCostCode, open, onOpenChange }: AddSubcategoryDialogProps) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    quantity: "",
    price: "",
    unitOfMeasure: "",
    hasSpecifications: "",
    hasBidding: "",
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        code: "",
        name: "",
        quantity: "",
        price: "",
        unitOfMeasure: "",
        hasSpecifications: "",
        hasBidding: "",
      });
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Auto-set parent_group and has_subcategories
    const submissionData = {
      ...formData,
      parentGroup: parentCode,
      hasSubcategories: "no", // Subcategories are always the lowest level
    };
    onAddCostCode(submissionData);
    onOpenChange(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Subcategory to {parentCode}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Cost Code */}
              <div className="space-y-2">
                <Label htmlFor="code">Cost Code *</Label>
                <Input
                  id="code"
                  type="number"
                  value={formData.code}
                  onChange={(e) => handleInputChange("code", e.target.value)}
                  placeholder="Enter cost code number"
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
                  placeholder="Enter cost code name"
                  required
                />
              </div>
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

            <div className="grid grid-cols-2 gap-4">
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

              {/* Has Specifications */}
              <div className="space-y-2">
                <Label htmlFor="hasSpecifications">Has Specifications</Label>
                <Select value={formData.hasSpecifications} onValueChange={(value) => handleInputChange("hasSpecifications", value)}>
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

            <div className="grid grid-cols-2 gap-4">
              {/* Has Bidding */}
              <div className="space-y-2">
                <Label htmlFor="hasBidding">Has Bidding</Label>
                <Select value={formData.hasBidding} onValueChange={(value) => handleInputChange("hasBidding", value)}>
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
                  <Button type="submit" className="flex-1">Add Subcategory</Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
