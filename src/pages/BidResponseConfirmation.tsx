import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";

export default function BidResponseConfirmation() {
  const [searchParams] = useSearchParams();
  
  const response = searchParams.get("response");
  const companyName = searchParams.get("company");
  const status = searchParams.get("status");

  if (status !== "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4">
              {willBid ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              Bid Response {willBid ? "Confirmed" : "Declined"}
            </h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-gray-600 mb-6">
                {willBid
                  ? `Thank you ${companyName}, for confirming you will bid on this project.`
                  : `Thank you ${companyName}, for letting us know you will not bid on this project. The project manager will be notified.`}
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