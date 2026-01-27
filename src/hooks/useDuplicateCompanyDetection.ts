import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  company_name: string;
}

interface UseDuplicateCompanyDetectionOptions {
  /** Table to query: 'companies' or 'marketplace_companies' */
  table: 'companies' | 'marketplace_companies';
  /** Minimum characters before searching */
  minLength?: number;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
}

interface UseDuplicateCompanyDetectionResult {
  potentialDuplicates: Company[];
  isChecking: boolean;
}

/**
 * Normalizes a company name for comparison by:
 * - Converting to lowercase
 * - Removing common business suffixes (LLC, Inc, LP, etc.)
 * - Removing punctuation
 * - Normalizing whitespace
 */
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(llc|inc|corp|corporation|ltd|lp|llp|co|company|incorporated|limited|partnership)\b/gi, '')
    .replace(/[.,\-''"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Finds similar companies based on normalized name comparison
 */
function findSimilarCompanies(searchName: string, existingCompanies: Company[]): Company[] {
  const normalized = normalizeCompanyName(searchName);
  
  if (!normalized || normalized.length < 2) {
    return [];
  }
  
  return existingCompanies.filter(company => {
    const existingNormalized = normalizeCompanyName(company.company_name);
    
    // Check if either normalized name contains the other
    if (existingNormalized.includes(normalized) || normalized.includes(existingNormalized)) {
      return true;
    }
    
    // Check word overlap
    const searchWords = normalized.split(' ').filter(w => w.length > 2);
    const existingWords = existingNormalized.split(' ').filter(w => w.length > 2);
    
    if (searchWords.length === 0) return false;
    
    const matchingWords = searchWords.filter(w => existingWords.includes(w));
    
    // Require at least one significant word match
    return matchingWords.length >= 1;
  });
}

/**
 * Hook for detecting potential duplicate companies as user types
 */
export function useDuplicateCompanyDetection(
  companyName: string,
  options: UseDuplicateCompanyDetectionOptions
): UseDuplicateCompanyDetectionResult {
  const { table, minLength = 3, debounceMs = 300 } = options;
  
  const [potentialDuplicates, setPotentialDuplicates] = useState<Company[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  useEffect(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const trimmedName = companyName.trim();
    
    // Don't search if name is too short
    if (trimmedName.length < minLength) {
      setPotentialDuplicates([]);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);

    // Debounce the search
    timeoutRef.current = setTimeout(async () => {
      abortControllerRef.current = new AbortController();
      
      try {
        // Fetch companies from the appropriate table
        let query = supabase
          .from(table)
          .select('id, company_name');
        
        // For companies table, filter out archived
        if (table === 'companies') {
          query = query.is('archived_at', null);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('Error fetching companies for duplicate check:', error);
          setPotentialDuplicates([]);
          setIsChecking(false);
          return;
        }
        
        // Find similar companies
        const similar = findSimilarCompanies(trimmedName, data || []);
        
        // Limit to top 5 results
        setPotentialDuplicates(similar.slice(0, 5));
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Error checking for duplicates:', err);
        setPotentialDuplicates([]);
      } finally {
        setIsChecking(false);
      }
    }, debounceMs);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [companyName, table, minLength, debounceMs]);

  return { potentialDuplicates, isChecking };
}
