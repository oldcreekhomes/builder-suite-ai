import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BidResponseConfirmation() {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);

  const response = searchParams.get("response");
  const status = searchParams.get("status");

  useEffect(() => {
    console.log("BidResponseConfirmation loaded - NEW SIMPLE VERSION");
    console.log("Response:", response);
    console.log("Status:", status);
    
    // Simulate a brief loading state for better UX
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [response, status]);

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show error page if status is not success
  if (status !== "success") {
    return (
      <div className="flex-1 w-full min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">
            There was an error processing your bid response. Please try again or contact support.
          </p>
          <Button 
            onClick={() => window.close()} 
            variant="destructive"
            className="px-6"
          >
            Close Window
          </Button>
        </div>
      </div>
    );
  }

  const willBid = response === "will_bid";

  return (
    <div className="flex-1 w-full min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4">
              {willBid ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              {willBid ? "Bidding Confirmed" : "Bidding Declined"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-gray-600 mb-6">
                {willBid
                  ? `Thank you. Please submit your bid by ${searchParams.get("due_date") ? new Date(searchParams.get("due_date")!).toLocaleDateString() : "the due date"}.`
                  : "We have recorded that you declined this bid. The project manager will be notified."}
              </p>
            </div>

            <div className="text-center">
              <Button onClick={() => window.close()} className="px-8 mb-4">
                Close Window
              </Button>
              <div>
                <a 
                  href="https://www.buildersuiteai.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-black no-underline hover:text-gray-700 transition-colors"
                >
                  www.buildersuiteai.com
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}