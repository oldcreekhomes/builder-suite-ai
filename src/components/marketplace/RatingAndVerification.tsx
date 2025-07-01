
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface RatingAndVerificationProps {
  rating: string;
  setRating: (value: string) => void;
  reviewCount: string;
  setReviewCount: (value: string) => void;
  insuranceVerified: boolean;
  setInsuranceVerified: (value: boolean) => void;
}

export function RatingAndVerification({
  rating,
  setRating,
  reviewCount,
  setReviewCount,
  insuranceVerified,
  setInsuranceVerified
}: RatingAndVerificationProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="rating">Rating (0-5)</Label>
          <Input
            id="rating"
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            placeholder="4.5"
          />
        </div>

        <div>
          <Label htmlFor="reviewCount">Review Count</Label>
          <Input
            id="reviewCount"
            type="number"
            min="0"
            value={reviewCount}
            onChange={(e) => setReviewCount(e.target.value)}
            placeholder="25"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="insuranceVerified"
          checked={insuranceVerified}
          onCheckedChange={(checked) => setInsuranceVerified(checked === true)}
        />
        <Label htmlFor="insuranceVerified">Insurance Verified</Label>
      </div>
    </>
  );
}
