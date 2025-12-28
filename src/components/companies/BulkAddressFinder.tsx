import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, CheckCircle, XCircle, Search, Phone, Globe, AlertCircle } from "lucide-react";

interface Company {
  id: string;
  company_name: string;
  address?: string | null;
  phone_number?: string | null;
  website?: string | null;
}

interface MissingFields {
  address: boolean;
  phone: boolean;
  website: boolean;
}

interface SearchResult {
  success: boolean;
  data?: {
    address?: string;
    phoneNumber?: string;
    website?: string;
  };
  originalName: string;
  missingFields: MissingFields;
  error?: any;
}

export function BulkAddressFinder() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Map<string, SearchResult>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    fetchCompaniesWithMissingData();
  }, []);

  const getMissingFields = (company: Company): MissingFields => ({
    address: !company.address || company.address.trim() === '',
    phone: !company.phone_number || company.phone_number.trim() === '',
    website: !company.website || company.website.trim() === '',
  });

  const hasMissingData = (company: Company): boolean => {
    const missing = getMissingFields(company);
    return missing.address || missing.phone || missing.website;
  };

  const fetchCompaniesWithMissingData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_name, address, phone_number, website')
        .or('address.is.null,address.eq.,phone_number.is.null,phone_number.eq.,website.is.null,website.eq.')
        .order('company_name');

      if (error) throw error;
      
      // Filter to only include companies with at least one missing field
      const companiesWithMissing = (data || []).filter(hasMissingData);
      setCompanies(companiesWithMissing);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Error",
        description: "Failed to fetch companies with missing data",
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
        fields: ['name', 'formatted_address', 'place_id'],
      };

      service.textSearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
          // Get more details including phone number
          const placeId = results[0].place_id;
          if (placeId) {
            service.getDetails({
              placeId,
              fields: ['name', 'formatted_address', 'formatted_phone_number', 'website']
            }, (place, detailStatus) => {
              if (detailStatus === window.google.maps.places.PlacesServiceStatus.OK && place) {
                resolve(place);
              } else {
                resolve(results[0]);
              }
            });
          } else {
            resolve(results[0]);
          }
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
    const newResults = new Map<string, SearchResult>();

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const missingFields = getMissingFields(company);
      
      try {
        const place = await searchGooglePlaces(company.company_name);
        if (place) {
          newResults.set(company.id, {
            success: true,
            data: {
              address: place.formatted_address,
              phoneNumber: place.formatted_phone_number,
              website: place.website,
            },
            originalName: company.company_name,
            missingFields,
          });
        } else {
          newResults.set(company.id, {
            success: false,
            originalName: company.company_name,
            missingFields,
          });
        }
      } catch (error) {
        console.error(`Error searching for ${company.company_name}:`, error);
        newResults.set(company.id, {
          success: false,
          error: error,
          originalName: company.company_name,
          missingFields,
        });
      }

      setProgress(((i + 1) / companies.length) * 100);
      
      // Small delay to avoid hitting API limits
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setResults(newResults);
    setSearching(false);
    
    const successCount = Array.from(newResults.values()).filter(r => r.success).length;
    toast({
      title: "Search Complete",
      description: `Found data for ${successCount} of ${companies.length} companies`,
    });
  };

  const applyAddress = async (companyId: string, result: SearchResult) => {
    const company = companies.find(c => c.id === companyId);
    if (!company || !result.data) return;

    try {
      // Only update fields that are currently empty
      const updateData: any = {};
      
      if (result.missingFields.address && result.data.address) {
        updateData.address = result.data.address;
      }
      if (result.missingFields.phone && result.data.phoneNumber) {
        updateData.phone_number = result.data.phoneNumber;
      }
      if (result.missingFields.website && result.data.website) {
        updateData.website = result.data.website;
      }

      if (Object.keys(updateData).length === 0) {
        toast({
          title: "No Updates",
          description: "No missing fields to update",
        });
        return;
      }

      const { error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', companyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${Object.keys(updateData).length} field(s) for ${company.company_name}`,
      });

      // Refresh the companies list
      fetchCompaniesWithMissingData();
      
      // Remove this result since it's been applied
      const newResults = new Map(results);
      newResults.delete(companyId);
      setResults(newResults);
    } catch (error) {
      console.error('Error updating company:', error);
      toast({
        title: "Error",
        description: "Failed to update company",
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
    let totalFieldsUpdated = 0;

    for (const [companyId, result] of successfulResults) {
      const company = companies.find(c => c.id === companyId);
      if (!company || !result.data) continue;

      try {
        // Only update fields that are currently empty
        const updateData: any = {};
        
        if (result.missingFields.address && result.data.address) {
          updateData.address = result.data.address;
        }
        if (result.missingFields.phone && result.data.phoneNumber) {
          updateData.phone_number = result.data.phoneNumber;
        }
        if (result.missingFields.website && result.data.website) {
          updateData.website = result.data.website;
        }

        if (Object.keys(updateData).length === 0) continue;

        const { error } = await supabase
          .from('companies')
          .update(updateData)
          .eq('id', companyId);

        if (error) throw error;
        appliedCount++;
        totalFieldsUpdated += Object.keys(updateData).length;
      } catch (error) {
        console.error(`Error updating company ${companyId}:`, error);
        errorCount++;
      }
    }

    toast({
      title: appliedCount > 0 ? "Success" : "Error",
      description: `Updated ${totalFieldsUpdated} fields across ${appliedCount} companies${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      variant: errorCount > 0 && appliedCount === 0 ? "destructive" : "default",
    });

    // Refresh the companies list and clear results
    await fetchCompaniesWithMissingData();
    setResults(new Map());
    setLoading(false);
  };

  const getMissingCount = () => {
    let addressCount = 0;
    let phoneCount = 0;
    let websiteCount = 0;
    
    companies.forEach(company => {
      const missing = getMissingFields(company);
      if (missing.address) addressCount++;
      if (missing.phone) phoneCount++;
      if (missing.website) websiteCount++;
    });
    
    return { addressCount, phoneCount, websiteCount };
  };

  const { addressCount, phoneCount, websiteCount } = getMissingCount();

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
            Bulk Data Finder
          </CardTitle>
          <CardDescription>
            Automatically find missing addresses, phone numbers, and websites using Google Places API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                <MapPin className="h-3.5 w-3.5" />
                {addressCount} missing addresses
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                <Phone className="h-3.5 w-3.5" />
                {phoneCount} missing phones
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                <Globe className="h-3.5 w-3.5" />
                {websiteCount} missing websites
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {companies.length} companies with missing data
              </p>
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
                    Find Missing Data
                  </>
                )}
              </Button>
            </div>
          </div>

          {searching && (
            <div className="space-y-2 mt-4">
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
                  Review and apply the found data (only missing fields will be updated)
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
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
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

                      {/* Show what fields are missing */}
                      <div className="flex gap-1.5 mb-2">
                        {result.missingFields.address && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Missing Address
                          </Badge>
                        )}
                        {result.missingFields.phone && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Missing Phone
                          </Badge>
                        )}
                        {result.missingFields.website && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Missing Website
                          </Badge>
                        )}
                      </div>
                      
                      {result.success && result.data && (
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {result.missingFields.address && result.data.address && (
                            <p className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-green-600" />
                              <span className="text-green-600 font-medium">Address:</span> {result.data.address}
                            </p>
                          )}
                          {result.missingFields.phone && result.data.phoneNumber && (
                            <p className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-green-600" />
                              <span className="text-green-600 font-medium">Phone:</span> {result.data.phoneNumber}
                            </p>
                          )}
                          {result.missingFields.website && result.data.website && (
                            <p className="flex items-center gap-1.5">
                              <Globe className="h-3.5 w-3.5 text-green-600" />
                              <span className="text-green-600 font-medium">Website:</span> {result.data.website}
                            </p>
                          )}
                          {/* Show message if no data found for missing fields */}
                          {result.missingFields.address && !result.data.address && (
                            <p className="text-orange-600 text-xs">⚠ No address found on Google</p>
                          )}
                          {result.missingFields.phone && !result.data.phoneNumber && (
                            <p className="text-orange-600 text-xs">⚠ No phone number found on Google</p>
                          )}
                          {result.missingFields.website && !result.data.website && (
                            <p className="text-orange-600 text-xs">⚠ No website found on Google</p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {result.success && result.data && (
                      <Button
                        size="sm"
                        onClick={() => applyAddress(companyId, result)}
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

      {companies.length > 0 && results.size === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Companies With Missing Data</CardTitle>
            <CardDescription>
              Click "Find Missing Data" to search for this information automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 max-h-[400px] overflow-y-auto">
              {companies.map((company) => {
                const missing = getMissingFields(company);
                return (
                  <div key={company.id} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm font-medium">{company.company_name}</span>
                    <div className="flex gap-1.5">
                      {missing.address && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <MapPin className="h-3 w-3" />
                          Address
                        </Badge>
                      )}
                      {missing.phone && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Phone className="h-3 w-3" />
                          Phone
                        </Badge>
                      )}
                      {missing.website && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Globe className="h-3 w-3" />
                          Website
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {companies.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-medium">All Companies Complete!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              All companies have addresses, phone numbers, and websites filled in.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}