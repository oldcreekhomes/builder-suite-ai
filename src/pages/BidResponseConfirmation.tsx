import { useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";

export default function BidResponseConfirmation() {
  const [searchParams] = useSearchParams();
  
  const response = searchParams.get("response");
  const status = searchParams.get("status");

  if (status !== "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">
            There was an error processing your bid response. Please try again or contact support.
          </p>
          <button 
            onClick={() => window.close()} 
            className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-6 rounded transition-colors mb-4"
          >
            Close Window
          </button>
          <div>
            <span className="text-sm text-gray-900">www.buildersuiteai.com</span>
          </div>
        </div>
      </div>
    );
  }

  const willBid = response === "will_bid";
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4">
          {willBid ? (
            <CheckCircle className="h-8 w-8 text-green-600" />
          ) : (
            <XCircle className="h-8 w-8 text-red-600" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Bid {willBid ? "Confirmed" : "Declined"}
        </h1>
        <p className="text-gray-600 mb-6">
          {willBid
            ? "Thank you for confirming you will bid on this project."
            : "We have recorded that you declined this bid. The project manager will be notified."}
        </p>
        <button 
          onClick={() => window.close()} 
          className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-6 rounded transition-colors mb-4"
        >
          Close Window
        </button>
        <div>
          <span className="text-sm text-gray-900">www.buildersuiteai.com</span>
        </div>
      </div>
    </div>
  );
}