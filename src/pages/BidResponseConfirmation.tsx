import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";

export default function BidResponseConfirmation() {
  const [searchParams] = useSearchParams();
  
  const response = searchParams.get("response");
  const companyName = searchParams.get("company");
  const projectName = searchParams.get("project");
  const projectAddress = searchParams.get("address");
  const bidPackageName = searchParams.get("bidPackage");
  const costCode = searchParams.get("costCode");
  const status = searchParams.get("status");

  if (status !== "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-destructive">Error</h1>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              There was an error processing your bid response.
            </p>
            <Button onClick={() => window.close()}>Close Window</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const willBid = response === "will_bid";
  const statusText = willBid ? "Yes, we will bid" : "No, we will not bid";
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-t-lg">
          <h1 className="text-3xl font-bold mb-2">Bid Response Confirmed</h1>
          <p className="text-primary-foreground/90">Thank you for your response!</p>
        </CardHeader>
        
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-lg font-semibold text-white ${
              willBid ? 'bg-emerald-500' : 'bg-red-500'
            }`}>
              {willBid ? (
                <CheckCircle className="h-6 w-6" />
              ) : (
                <XCircle className="h-6 w-6" />
              )}
              {statusText}
            </div>
          </div>
          
          <p className="text-center mb-8">
            <strong>{companyName}</strong>, your bid response has been successfully recorded.
          </p>
          
          <div className="bg-muted p-6 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Project Details</h3>
            <div className="space-y-3">
              <div className="flex">
                <span className="font-medium min-w-[120px] text-muted-foreground">Project:</span>
                <span className="text-foreground">{projectName || 'N/A'}</span>
              </div>
              <div className="flex">
                <span className="font-medium min-w-[120px] text-muted-foreground">Address:</span>
                <span className="text-foreground">{projectAddress || 'N/A'}</span>
              </div>
              <div className="flex">
                <span className="font-medium min-w-[120px] text-muted-foreground">Bid Package:</span>
                <span className="text-foreground">{bidPackageName || 'N/A'}</span>
              </div>
              <div className="flex">
                <span className="font-medium min-w-[120px] text-muted-foreground">Cost Code:</span>
                <span className="text-foreground">{costCode || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-6 text-center">
            Your response has been recorded and the project team will be notified.{' '}
            {willBid 
              ? 'Please watch for further communications regarding this project.' 
              : 'Thank you for letting us know.'
            }
          </p>
          
          <div className="text-center">
            <Button onClick={() => window.close()} className="px-8">
              Close Window
            </Button>
          </div>
        </CardContent>
        
        <div className="text-center p-4 bg-muted/50 text-sm text-muted-foreground rounded-b-lg">
          <p>This response was recorded on {new Date().toLocaleString()}</p>
        </div>
      </Card>
    </div>
  );
}