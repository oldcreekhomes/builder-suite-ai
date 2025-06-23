
import { useState } from "react";

export function usePhotoPan() {
  const [panEnabled, setPanEnabled] = useState(false);

  const togglePan = () => {
    setPanEnabled(prev => !prev);
  };

  const disablePan = () => {
    setPanEnabled(false);
  };

  return {
    panEnabled,
    togglePan,
    disablePan
  };
}
