import { createContext, useContext, useState, ReactNode } from 'react';

interface AppLoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  loadingPhase: string;
  setLoadingPhase: (phase: string) => void;
}

const AppLoadingContext = createContext<AppLoadingContextType | undefined>(undefined);

export const useAppLoading = () => {
  const context = useContext(AppLoadingContext);
  if (!context) {
    throw new Error('useAppLoading must be used within AppLoadingProvider');
  }
  return context;
};

export const AppLoadingProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('Preparing your workspace...');

  return (
    <AppLoadingContext.Provider value={{ isLoading, setIsLoading, loadingPhase, setLoadingPhase }}>
      {children}
    </AppLoadingContext.Provider>
  );
};
