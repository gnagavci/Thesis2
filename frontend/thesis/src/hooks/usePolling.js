import { useEffect, useState, useRef } from "react";

export function usePolling(fetchFn) {
  const interval = 5000;
  const retryAttempts = 3;

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const retryCountRef = useRef(0);
  const timeoutRef = useRef(null);

  const clearPolling = () => {
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const poll = async () => {
    try {
      setLoading(true);
      const result = await fetchFn();

      setData(result);
      setError(null);
      retryCountRef.current = 0;
      setLoading(false);

      
      timeoutRef.current = setTimeout(poll, interval);

    } catch (err) {

      setError(err);
      setLoading(false);

      
      if (retryCountRef.current < retryAttempts) {
        retryCountRef.current += 1;
        timeoutRef.current = setTimeout(poll, interval);
      }
    }
  };

  useEffect(() => {
    poll();

    return () => {
      clearPolling();
    };
  }, [fetchFn]);

  const refetch = () => {
    clearPolling();
    retryCountRef.current = 0;
    poll();
  };

  return { data, error, loading, refetch };
}
