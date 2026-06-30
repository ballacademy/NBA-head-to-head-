import { useEffect, useState } from "react";
import { getDailyDateKey } from "./dailyDraft";

export const useDailyDateKey = () => {
  const [dateKey, setDateKey] = useState(getDailyDateKey);

  useEffect(() => {
    const syncDateKey = () => {
      const nextKey = getDailyDateKey();
      setDateKey((current) => (current === nextKey ? current : nextKey));
    };

    syncDateKey();
    const intervalId = window.setInterval(syncDateKey, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return dateKey;
};
