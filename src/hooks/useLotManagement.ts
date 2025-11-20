import { useState, useEffect } from 'react';

const LOT_SELECTION_STORAGE_KEY = 'selected-lot-';

export function useLotManagement(projectId: string | undefined) {
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);

  // Load selected lot from localStorage on mount
  useEffect(() => {
    if (projectId) {
      const stored = localStorage.getItem(LOT_SELECTION_STORAGE_KEY + projectId);
      if (stored) {
        setSelectedLotId(stored);
      }
    }
  }, [projectId]);

  // Save selected lot to localStorage when it changes
  const selectLot = (lotId: string | null) => {
    setSelectedLotId(lotId);
    if (projectId && lotId) {
      localStorage.setItem(LOT_SELECTION_STORAGE_KEY + projectId, lotId);
    } else if (projectId) {
      localStorage.removeItem(LOT_SELECTION_STORAGE_KEY + projectId);
    }
  };

  return {
    selectedLotId,
    selectLot,
  };
}
