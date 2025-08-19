import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, CheckCircle, XCircle, Search } from "lucide-react";
import { createFormDataFromPlace } from "@/utils/marketplaceCompanyUtils";

interface Company {
  id: string;
  company_name: string;
  address?: string;
  phone_number?: string;
  website?: string;
}

export function BulkAddressFinder() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Map<string, any>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    fetchCompaniesWithoutAddresses();
  }, []);

  const fetchCompaniesWithoutAddresses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_name, address, phone_number, website')
        .or('address.is.null,address.eq.')
        .order('company_name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Error",
        description: "Failed to fetch companies without addresses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchGooglePlaces = async (companyName: string): Promise<any> => {
    return new Promise((resolve) => {
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        resolve(null);
        return;
      }

      const service = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );

      const request = {
        query: companyName,
        fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'rating', 'user_ratings_total', 'types'],
      };

      service.textSearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
          resolve(results[0]);
        } else {
          resolve(null);
        }
      });
    });
  };

  const bulkSearchAddresses = async () => {
    if (companies.length === 0) return;

    setSearching(true);
    setProgress(0);
    const newResults = new Map();

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      
      try {
        const place = await searchGooglePlaces(company.company_name);
        if (place) {
          const placeData = createFormDataFromPlace(place);
          newResults.set(company.id, {
            success: true,
            data: placeData,
            originalName: company.company_name
          });
        } else {
          newResults.set(company.id, {
            success: false,
            originalName: company.company_name
          });
        }
      } catch (error) {
        console.error(`Error searching for ${company.company_name}:`, error);
        newResults.set(company.id, {
          success: false,
          error: error,
          originalName: company.company_name
        });
      }

      setProgress(((i + 1) / companies.length) * 100);
      
      // Small delay to avoid hitting API limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setResults(newResults);
    setSearching(false);
  };

  const applyAddress = async (companyId: string, addressData: any) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          address: addressData.address,
          phone_number: addressData.phoneNumber || null,
          website: addressData.website || null,
        })
        .eq('id', companyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Address updated successfully",
      });

      // Refresh the companies list
      fetchCompaniesWithoutAddresses();
      
      // Remove this result since it's been applied
      const newResults = new Map(results);
      newResults.delete(companyId);
      setResults(newResults);
    } catch (error) {
      console.error('Error updating company:', error);
      toast({
        title: "Error",
        description: "Failed to update company address",
        variant: "destructive",
      });
    }
  };

  const massApplyAddresses = async () => {
    const successfulResults = Array.from(results.entries()).filter(
      ([_, result]) => result.success && result.data
    );

    if (successfulResults.length === 0) return;

    setLoading(true);
    let appliedCount = 0;
    let errorCount = 0;

    for (const [companyId, result] of successfulResults) {
      try {
        const { error } = await supabase
          .from('companies')
          .update({
            address: result.data.address,
            phone_number: result.data.phoneNumber || null,
            website: result.data.website || null,
          })
          .eq('id', companyId);

        if (error) throw error;
        appliedCount++;
      } catch (error) {
        console.error(`Error updating company ${companyId}:`, error);
        errorCount++;
      }
    }

    toast({
      title: appliedCount > 0 ? "Success" : "Error",
      description: `Applied ${appliedCount} addresses successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      variant: errorCount > 0 && appliedCount === 0 ? "destructive" : "default",
    });

    // Refresh the companies list and clear results
    await fetchCompaniesWithoutAddresses();
    setResults(new Map());
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading companies...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Bulk Address Finder
          </CardTitle>
          <CardDescription>
            Automatically find addresses for companies using Google Places API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {companies.length} companies found without addresses
              </p>
            </div>
            <Button 
              onClick={bulkSearchAddresses}
              disabled={searching || companies.length === 0}
            >
              {searching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Find Addresses
                </>
              )}
            </Button>
          </div>

          {searching && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {Math.round(progress)}% complete
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {results.size > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  Review and apply the found addresses
                </CardDescription>
              </div>
              {Array.from(results.values()).some(result => result.success && result.data) && (
                <Button
                  onClick={massApplyAddresses}
                  disabled={loading}
                  variant="default"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Apply All
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from(results.entries()).map(([companyId, result]) => (
                <div key={companyId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{result.originalName}</h4>
                        {result.success ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Found
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Not Found
                          </Badge>
                        )}
                      </div>
                      
                      {result.success && result.data && (
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {result.data.address && (
                            <p><strong>Address:</strong> {result.data.address}</p>
                          )}
                          {result.data.phoneNumber && (
                            <p><strong>Phone:</strong> {result.data.phoneNumber}</p>
                          )}
                          {result.data.website && (
                            <p><strong>Website:</strong> {result.data.website}</p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {result.success && result.data && (
                      <Button
                        size="sm"
                        onClick={() => applyAddress(companyId, result.data)}
                      >
                        Apply
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {companies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Companies Without Addresses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {companies.map((company) => (
                <div key={company.id} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{company.company_name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}