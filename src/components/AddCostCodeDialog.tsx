import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

interface AddCostCodeDialogProps {
  existingCostCodes: Array<{ code: string; name: string; }>;
  onAddCostCode: (costCode: any) => void;
}

export function AddCostCodeDialog({ existingCostCodes, onAddCostCode }: AddCostCodeDialogProps) {
  const [open, setOpen] = useState(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submissionData = {
      ...formData,
      parentGroup: formData.parentGroup === "none" ? null : formData.parentGroup
    };
    onAddCostCode(submissionData);
    setFormData({
      code: "",
      name: "",
      parentGroup: "",
      quantity: "",
      price: "",
      unitOfMeasure: "",
      hasSpecifications: "",
      hasBidding: "",
    });
    setOpen(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Cost Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Cost Code</DialogTitle>
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
              {/* Parent Group */}
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Cost Code</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
