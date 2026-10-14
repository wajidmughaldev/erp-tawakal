'use client';
import {useCallback, useEffect, useState} from 'react';
export function useResource<T>(load: () => Promise<T>, dependencies: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const refetch = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    let current = true;
    setLoading(true); setError(''); setData(null);
    load().then(result => {if (current) setData(result);}).catch(cause => {if (current) setError(cause instanceof Error ? cause.message : 'Unable to load data.');}).finally(() => {if (current) setLoading(false);});
    return () => {current = false;};
  }, [...dependencies, version]);
  return {data, error, loading, refetch};
}
