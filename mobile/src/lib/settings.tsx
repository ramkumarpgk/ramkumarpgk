import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

export interface Settings {
  serverUrl: string;
  apiKey: string;
}

const KEY = 'family-calendar/settings';
const DEFAULTS: Settings = {
  // Set EXPO_PUBLIC_API_URL in mobile/.env to change the default for everyone.
  serverUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000',
  apiKey: process.env.EXPO_PUBLIC_API_KEY ?? '',
};

interface Ctx {
  settings: Settings;
  loaded: boolean;
  update: (s: Settings) => Promise<void>;
}

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setSettings({ ...DEFAULTS, ...JSON.parse(raw) }))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback(async (s: Settings) => {
    const clean = { serverUrl: s.serverUrl.trim().replace(/\/+$/, ''), apiKey: s.apiKey.trim() };
    setSettings(clean);
    await AsyncStorage.setItem(KEY, JSON.stringify(clean));
  }, []);

  return <SettingsContext.Provider value={{ settings, loaded, update }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
