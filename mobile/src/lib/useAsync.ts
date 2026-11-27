import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

/** Load data every time a screen comes into focus. */
export function useFocusLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async () => {
    setLoading(true);
    try {
      setData(await load());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, deps);

  useFocusEffect(
    useCallback(() => {
      run();
    }, [run])
  );

  return { data, error, loading, reload: run };
}
