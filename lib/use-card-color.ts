'use client';
import {useCallback, useEffect, useState} from 'react';
import {cardSettingsApi} from './services';
import type {CardColor} from './contracts';

const fallback: CardColor = {color: '#092a4a', defaultColor: '#092a4a', isDefault: true};
let current: CardColor | undefined;
let loading: Promise<void> | undefined;
const listeners = new Set<() => void>();
const publish = (value: CardColor) => {current = value; listeners.forEach(listener => listener());};

/** Mixes a hex colour with black; used for the darker end of the card gradient. */
export function darken(hex: string, amount = 0.3) {
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex : fallback.color;
  const channel = (start: number) => Math.round(parseInt(value.slice(start, start + 2), 16) * (1 - amount)).toString(16).padStart(2, '0');
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

function load() {
  loading ??= cardSettingsApi.get().then(result => {if (result.data?.color) publish(result.data);}).catch(() => {}).finally(() => {loading = undefined;});
  return loading;
}

/** The one colour printed on every ID card, shared by all components on the page. */
export function useCardColor() {
  const [value, setValue] = useState<CardColor>(current ?? fallback);
  useEffect(() => {
    const sync = () => setValue(current ?? fallback);
    listeners.add(sync);
    void load();
    sync();
    return () => {listeners.delete(sync);};
  }, []);
  const save = useCallback(async (color: string) => {
    const result = await cardSettingsApi.update(color);
    if (!result.data?.color) throw new Error('The server did not confirm the colour.');
    publish(result.data);
  }, []);
  const reset = useCallback(async () => {
    const result = await cardSettingsApi.reset();
    if (!result.data?.color) throw new Error('The server did not confirm the reset.');
    publish(result.data);
  }, []);
  return {...value, save, reset};
}
