
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

interface CostCode {
  code: string;
  name: string;
  category: string;
}

interface EditCostCodeDialogProps {
  costCode: CostCode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCostCodes: Array<{ code: string; name: string; }>;
  onUpdateCostCode: (oldCode: string, updatedCostCode: any) => void;
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
    parentGroup: "",
    quantity: "",
    price: "",
    unitOfMeasure: "",
    hasSpecifications: "",
    hasBidding: "",
  });

  useEffect(() => {
    if (costCode) {
      setFormData({
        code: costCode.code,
        name: costCode.name,
        parentGroup: costCode.category || "",
        quantity: "",
        price: "",
        unitOfMeasure: "",
        hasSpecifications: "",
        hasBidding: "",
      });
    }
  }, [costCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (costCode) {
      onUpdateCostCode(costCode.code, formData);
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
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="parentGroup">Parent Group</Label>
                <Select value={formData.parentGroup} onValueChange={(value) => handleInputChange("parentGroup", value)}>
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
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  placeholder="Enter quantity"
                />
              </div>
            </div>

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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Update Cost Code</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
