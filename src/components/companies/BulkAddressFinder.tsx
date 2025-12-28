import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, CheckCircle, XCircle, Search, Phone, Globe, AlertCircle, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

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

interface Candidate {
  name: string;
  address?: string;
  phoneNumber?: string;
  website?: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  matchReasons: string[];
}

interface SearchResult {
  success: boolean;
  candidates: Candidate[];
  selectedCandidateIndex: number;
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
  const [bestGuessMode, setBestGuessMode] = useState(true);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
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

  // Clean website URLs to remove tracking parameters and ad subdomains
  const cleanWebsiteUrl = (url: string): string => {
    if (!url) return url;
    try {
      const parsed = new URL(url);
      let hostname = parsed.hostname;
      
      // Remove common ad/tracking subdomains
      hostname = hostname.replace(/^(local|go|click|landing|ads|lp|track|promo|offer|deal|get|www)\./i, '');
      
      return `https://www.${hostname}`;
    } catch {
      return url.split('?')[0].split('#')[0];
    }
  };

  // Normalize company name for comparison
  const normalizeName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/\b(llc|inc|corp|co|ltd|company|incorporated|corporation|services|service)\b/gi, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  // Calculate similarity between two strings (0-1)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = normalizeName(str1);
    const s2 = normalizeName(str2);
    
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.85;
    
    // Simple character overlap score
    const chars1 = new Set(s1.split(''));
    const chars2 = new Set(s2.split(''));
    const intersection = [...chars1].filter(c => chars2.has(c)).length;
    const union = new Set([...chars1, ...chars2]).size;
    
    return union > 0 ? intersection / union : 0;
  };

  // Check if address is in target region (VA/DC/MD)
  const isInTargetRegion = (address: string): boolean => {
    const regionPatterns = [
      /\bva\b/i, /\bvirginia\b/i,
      /\bmd\b/i, /\bmaryland\b/i,
      /\bdc\b/i, /\bwashington\s*d\.?c\.?\b/i,
      /\bdistrict\s+of\s+columbia\b/i
    ];
    return regionPatterns.some(pattern => pattern.test(address));
  };

  // Score a candidate based on match quality
  const scoreCandidate = (
    candidate: { name?: string; address?: string; phone?: string; website?: string },
    companyName: string,
    existingWebsite?: string | null,
    existingPhone?: string | null
  ): { score: number; reasons: string[] } => {
    let score = 0;
    const reasons: string[] = [];

    // Name similarity (0-40 points)
    if (candidate.name) {
      const nameSimilarity = calculateSimilarity(candidate.name, companyName);
      const nameScore = Math.round(nameSimilarity * 40);
      score += nameScore;
      if (nameSimilarity > 0.7) reasons.push(`Name match: ${Math.round(nameSimilarity * 100)}%`);
    }

    // Region match (0-25 points)
    if (candidate.address) {
      if (isInTargetRegion(candidate.address)) {
        score += 25;
        reasons.push('Located in VA/DC/MD');
      } else {
        score -= 15; // Penalize out-of-region
      }
    }

    // Website domain match (0-20 points)
    if (existingWebsite && candidate.website) {
      try {
        const existingDomain = new URL(existingWebsite).hostname.replace(/^www\./, '');
        const candidateDomain = new URL(candidate.website).hostname.replace(/^www\./, '');
        if (existingDomain === candidateDomain) {
          score += 20;
          reasons.push('Website matches');
        }
      } catch {}
    }

    // Phone match (0-15 points)
    if (existingPhone && candidate.phone) {
      const existingDigits = existingPhone.replace(/\D/g, '').slice(-10);
      const candidateDigits = candidate.phone.replace(/\D/g, '').slice(-10);
      if (existingDigits.length >= 7 && candidateDigits.length >= 7) {
        if (existingDigits === candidateDigits) {
          score += 15;
          reasons.push('Phone matches');
        } else if (existingDigits.slice(-7) === candidateDigits.slice(-7)) {
          score += 10;
          reasons.push('Phone partially matches');
        }
      }
    }

    // Bonus for having complete data
    if (candidate.address && candidate.phone && candidate.website) {
      score += 5;
      reasons.push('Complete data');
    }

    return { score: Math.max(0, score), reasons };
  };

  // Get confidence level from score
  const getConfidence = (score: number): 'high' | 'medium' | 'low' => {
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  };

  // Search using AutocompleteService for better predictions
  const searchWithAutocomplete = async (companyName: string): Promise<google.maps.places.AutocompletePrediction[]> => {
    return new Promise((resolve) => {
      if (!window.google?.maps?.places?.AutocompleteService) {
        resolve([]);
        return;
      }

      const service = new window.google.maps.places.AutocompleteService();
      
      // Search with multiple query variations for better results
      const queries = [
        `${companyName} Virginia`,
        `${companyName} VA`,
        `${companyName} Maryland`,
        `${companyName} DC`,
        companyName
      ];

      const allPredictions: google.maps.places.AutocompletePrediction[] = [];
      let completed = 0;

      queries.forEach((query) => {
        service.getPlacePredictions(
          {
            input: query,
            types: ['establishment'],
            componentRestrictions: { country: 'us' },
          },
          (predictions, status) => {
            completed++;
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              predictions.forEach(p => {
                if (!allPredictions.find(existing => existing.place_id === p.place_id)) {
                  allPredictions.push(p);
                }
              });
            }
            if (completed === queries.length) {
              resolve(allPredictions.slice(0, 8)); // Return top 8 unique predictions
            }
          }
        );
      });
    });
  };

  // Get place details by place_id
  const getPlaceDetails = async (placeId: string): Promise<google.maps.places.PlaceResult | null> => {
    return new Promise((resolve) => {
      if (!window.google?.maps?.places?.PlacesService) {
        resolve(null);
        return;
      }

      const service = new window.google.maps.places.PlacesService(document.createElement('div'));
      
      service.getDetails(
        {
          placeId,
          fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'place_id']
        },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            resolve(place);
          } else {
            resolve(null);
          }
        }
      );
    });
  };

  // Main search function with multi-candidate scoring
  const searchGooglePlaces = async (company: Company): Promise<Candidate[]> => {
    const predictions = await searchWithAutocomplete(company.company_name);
    
    if (predictions.length === 0) {
      return [];
    }

    // Get details for top predictions (limit to 5 to avoid too many API calls)
    const detailsPromises = predictions.slice(0, 5).map(p => getPlaceDetails(p.place_id));
    const placesDetails = await Promise.all(detailsPromises);

    // Score and rank candidates
    const candidates: Candidate[] = [];

    for (const place of placesDetails) {
      if (!place) continue;

      const { score, reasons } = scoreCandidate(
        {
          name: place.name,
          address: place.formatted_address,
          phone: place.formatted_phone_number,
          website: place.website,
        },
        company.company_name,
        company.website,
        company.phone_number
      );

      candidates.push({
        name: place.name || '',
        address: place.formatted_address,
        phoneNumber: place.formatted_phone_number,
        website: place.website ? cleanWebsiteUrl(place.website) : undefined,
        score,
        confidence: getConfidence(score),
        matchReasons: reasons,
      });
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    return candidates;
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
        const candidates = await searchGooglePlaces(company);
        
        if (candidates.length > 0) {
          newResults.set(company.id, {
            success: true,
            candidates,
            selectedCandidateIndex: 0, // Default to best match
            originalName: company.company_name,
            missingFields,
          });
        } else {
          newResults.set(company.id, {
            success: false,
            candidates: [],
            selectedCandidateIndex: -1,
            originalName: company.company_name,
            missingFields,
          });
        }
      } catch (error) {
        console.error(`Error searching for ${company.company_name}:`, error);
        newResults.set(company.id, {
          success: false,
          candidates: [],
          selectedCandidateIndex: -1,
          error,
          originalName: company.company_name,
          missingFields,
        });
      }

      setProgress(((i + 1) / companies.length) * 100);
      
      // Delay to avoid hitting API limits
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    setResults(newResults);
    setSearching(false);
    
    const successCount = Array.from(newResults.values()).filter(r => r.success).length;
    const highConfCount = Array.from(newResults.values()).filter(
      r => r.success && r.candidates[0]?.confidence === 'high'
    ).length;
    
    toast({
      title: "Search Complete",
      description: `Found ${successCount} matches (${highConfCount} high confidence) for ${companies.length} companies`,
    });
  };

  const selectCandidate = (companyId: string, candidateIndex: number) => {
    const newResults = new Map(results);
    const result = newResults.get(companyId);
    if (result) {
      result.selectedCandidateIndex = candidateIndex;
      newResults.set(companyId, result);
      setResults(newResults);
    }
  };

  const toggleExpanded = (companyId: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(companyId)) {
      newExpanded.delete(companyId);
    } else {
      newExpanded.add(companyId);
    }
    setExpandedResults(newExpanded);
  };

  const applyAddress = async (companyId: string, result: SearchResult) => {
    const company = companies.find(c => c.id === companyId);
    const candidate = result.candidates[result.selectedCandidateIndex];
    if (!company || !candidate) return;

    try {
      const updateData: any = {};
      
      if (result.missingFields.address && candidate.address) {
        updateData.address = candidate.address;
      }
      if (result.missingFields.phone && candidate.phoneNumber) {
        updateData.phone_number = candidate.phoneNumber;
      }
      if (result.missingFields.website && candidate.website) {
        updateData.website = candidate.website;
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

      fetchCompaniesWithMissingData();
      
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
    // In best guess mode, only apply high confidence results
    const resultsToApply = Array.from(results.entries()).filter(([_, result]) => {
      if (!result.success || result.candidates.length === 0) return false;
      const candidate = result.candidates[result.selectedCandidateIndex];
      return bestGuessMode ? candidate?.confidence === 'high' : true;
    });

    if (resultsToApply.length === 0) {
      toast({
        title: "No Results to Apply",
        description: bestGuessMode 
          ? "No high-confidence matches found. Review lower confidence matches manually."
          : "No results available to apply.",
      });
      return;
    }

    setLoading(true);
    let appliedCount = 0;
    let errorCount = 0;
    let totalFieldsUpdated = 0;

    for (const [companyId, result] of resultsToApply) {
      const company = companies.find(c => c.id === companyId);
      const candidate = result.candidates[result.selectedCandidateIndex];
      if (!company || !candidate) continue;

      try {
        const updateData: any = {};
        
        if (result.missingFields.address && candidate.address) {
          updateData.address = candidate.address;
        }
        if (result.missingFields.phone && candidate.phoneNumber) {
          updateData.phone_number = candidate.phoneNumber;
        }
        if (result.missingFields.website && candidate.website) {
          updateData.website = candidate.website;
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

    await fetchCompaniesWithMissingData();
    setResults(new Map());
    setLoading(false);
  };

  const skipResult = (companyId: string) => {
    const newResults = new Map(results);
    newResults.delete(companyId);
    setResults(newResults);
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

  const getResultStats = () => {
    let high = 0, medium = 0, low = 0, notFound = 0;
    results.forEach(result => {
      if (!result.success) {
        notFound++;
      } else {
        const conf = result.candidates[0]?.confidence;
        if (conf === 'high') high++;
        else if (conf === 'medium') medium++;
        else low++;
      }
    });
    return { high, medium, low, notFound };
  };

  const { addressCount, phoneCount, websiteCount } = getMissingCount();
  const resultStats = getResultStats();

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-green-600 text-white gap-1"><Sparkles className="h-3 w-3" />High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-white gap-1">Medium</Badge>;
      case 'low':
        return <Badge className="bg-orange-500 text-white gap-1">Low</Badge>;
    }
  };

  if (loading && companies.length === 0) {
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
            Find missing addresses, phone numbers, and websites using Google Places with smart matching
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

            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="best-guess"
                  checked={bestGuessMode}
                  onCheckedChange={setBestGuessMode}
                />
                <Label htmlFor="best-guess" className="flex items-center gap-2 cursor-pointer">
                  <Sparkles className="h-4 w-4 text-green-600" />
                  Best Guess Mode
                  <span className="text-xs text-muted-foreground">(auto-apply high confidence only)</span>
                </Label>
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
                <CardDescription className="flex gap-3 mt-2">
                  <span className="text-green-600">{resultStats.high} high confidence</span>
                  <span className="text-yellow-600">{resultStats.medium} medium</span>
                  <span className="text-orange-600">{resultStats.low} low</span>
                  <span className="text-muted-foreground">{resultStats.notFound} not found</span>
                </CardDescription>
              </div>
              {resultStats.high > 0 && (
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
                      {bestGuessMode ? `Apply ${resultStats.high} High Confidence` : 'Apply All'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {Array.from(results.entries()).map(([companyId, result]) => {
                const selectedCandidate = result.candidates[result.selectedCandidateIndex];
                const isExpanded = expandedResults.has(companyId);
                
                return (
                  <div key={companyId} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{result.originalName}</h4>
                          {result.success && selectedCandidate ? (
                            getConfidenceBadge(selectedCandidate.confidence)
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Not Found
                            </Badge>
                          )}
                        </div>

                        {/* Missing fields badges */}
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
                        
                        {result.success && selectedCandidate && (
                          <div className="space-y-2">
                            {/* Best match info */}
                            <div className="bg-muted/50 rounded p-3 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">
                                  Best Match: {selectedCandidate.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Score: {selectedCandidate.score}/100
                                </span>
                              </div>
                              
                              {selectedCandidate.matchReasons.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {selectedCandidate.matchReasons.map((reason, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {reason}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              <div className="space-y-1 text-sm">
                                {result.missingFields.address && selectedCandidate.address && (
                                  <p className="flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 text-green-600" />
                                    <span className="text-green-600 font-medium">Address:</span> {selectedCandidate.address}
                                  </p>
                                )}
                                {result.missingFields.phone && selectedCandidate.phoneNumber && (
                                  <p className="flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5 text-green-600" />
                                    <span className="text-green-600 font-medium">Phone:</span> {selectedCandidate.phoneNumber}
                                  </p>
                                )}
                                {result.missingFields.website && selectedCandidate.website && (
                                  <p className="flex items-center gap-1.5">
                                    <Globe className="h-3.5 w-3.5 text-green-600" />
                                    <span className="text-green-600 font-medium">Website:</span> {selectedCandidate.website}
                                  </p>
                                )}
                                {result.missingFields.address && !selectedCandidate.address && (
                                  <p className="text-orange-600 text-xs">⚠ No address found</p>
                                )}
                                {result.missingFields.phone && !selectedCandidate.phoneNumber && (
                                  <p className="text-orange-600 text-xs">⚠ No phone found</p>
                                )}
                                {result.missingFields.website && !selectedCandidate.website && (
                                  <p className="text-orange-600 text-xs">⚠ No website found</p>
                                )}
                              </div>
                            </div>

                            {/* Alternative candidates */}
                            {result.candidates.length > 1 && (
                              <div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpanded(companyId)}
                                  className="text-xs gap-1 p-0 h-auto"
                                >
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  {isExpanded ? 'Hide' : 'Show'} {result.candidates.length - 1} other match{result.candidates.length > 2 ? 'es' : ''}
                                </Button>

                                {isExpanded && (
                                  <div className="mt-2 space-y-2">
                                    {result.candidates.slice(1).map((candidate, idx) => (
                                      <div
                                        key={idx}
                                        className={`border rounded p-2 cursor-pointer hover:bg-muted/50 transition ${
                                          result.selectedCandidateIndex === idx + 1 ? 'ring-2 ring-primary' : ''
                                        }`}
                                        onClick={() => selectCandidate(companyId, idx + 1)}
                                      >
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-sm font-medium">{candidate.name}</span>
                                          {getConfidenceBadge(candidate.confidence)}
                                        </div>
                                        <div className="text-xs text-muted-foreground space-y-0.5">
                                          {candidate.address && <p>📍 {candidate.address}</p>}
                                          {candidate.phoneNumber && <p>📞 {candidate.phoneNumber}</p>}
                                          {candidate.website && <p>🌐 {candidate.website}</p>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        {result.success && selectedCandidate && (
                          <Button
                            size="sm"
                            onClick={() => applyAddress(companyId, result)}
                          >
                            Apply
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => skipResult(companyId)}
                        >
                          Skip
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {companies.length > 0 && results.size === 0 && !searching && (
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
