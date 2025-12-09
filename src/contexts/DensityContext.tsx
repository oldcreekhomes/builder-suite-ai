import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Density = "comfortable" | "cozy" | "compact";

interface DensityContextType {
  density: Density;
  setDensity: (density: Density) => void;
}

const DensityContext = createContext<DensityContextType | undefined>(undefined);

const STORAGE_KEY = "table-density";

export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<Density>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as Density) || "comfortable";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, density);
    document.documentElement.setAttribute("data-density", density);
  }, [density]);

  // Set initial attribute on mount
  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
  }, []);

  const setDensity = (newDensity: Density) => {
    setDensityState(newDensity);
  };

  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity() {
  const context = useContext(DensityContext);
  if (!context) {
    throw new Error("useDensity must be used within a DensityProvider");
  }
  return context;
}
