import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Project {
  id: string;
  address: string;
  status?: string;
}

export function useProjectSearch() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, address, status')
          .order('address');

        if (error) throw error;
        setProjects(data || []);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const searchProjects = (query: string) => {
    if (!query.trim()) return projects;
    
    const lowercaseQuery = query.toLowerCase();
    return projects.filter(project => 
      project.address.toLowerCase().includes(lowercaseQuery)
    );
  };

  return { projects, searchProjects, loading };
}