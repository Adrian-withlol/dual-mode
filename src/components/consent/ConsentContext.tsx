"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getCookie, setCookie } from "@/lib/cookies";

export const CONSENT_COOKIE_NAME = "cookie-consent";
const CONSENT_COOKIE_DAYS = 180;

export type ConsentValue = "accepted" | "rejected" | null;

interface ConsentContextValue {
  /** null = no choice made yet (banner should show). */
  consent: ConsentValue;
  /** Whether the preferences banner/panel should currently be visible. */
  bannerOpen: boolean;
  accept: () => void;
  reject: () => void;
  /** Reopens the banner so the choice can be changed at any time. */
  openPreferences: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    consent: ConsentValue;
    hydrated: boolean;
    bannerOpen: boolean;
  }>({ consent: null, hydrated: false, bannerOpen: false });
  const { consent, hydrated, bannerOpen } = state;

  useEffect(() => {
    // Cookies can't be read during server rendering without opting this
    // layout into per-request dynamic rendering (which would forfeit static
    // generation for every route, including /privacy and /terms). Reading
    // the stored choice once on mount keeps those pages static and only
    // costs one extra client-side render for the banner's visibility.
    const stored = getCookie(CONSENT_COOKIE_NAME);
    const resolved = stored === "accepted" || stored === "rejected" ? stored : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
    setState({ consent: resolved, hydrated: true, bannerOpen: resolved === null });
  }, []);

  const accept = useCallback(() => {
    setCookie(CONSENT_COOKIE_NAME, "accepted", CONSENT_COOKIE_DAYS);
    setState((prev) => ({ ...prev, consent: "accepted", bannerOpen: false }));
  }, []);

  const reject = useCallback(() => {
    setCookie(CONSENT_COOKIE_NAME, "rejected", CONSENT_COOKIE_DAYS);
    setState((prev) => ({ ...prev, consent: "rejected", bannerOpen: false }));
  }, []);

  const openPreferences = useCallback(() => {
    setState((prev) => ({ ...prev, bannerOpen: true }));
  }, []);

  const value = useMemo(
    () => ({ consent, bannerOpen: hydrated && bannerOpen, accept, reject, openPreferences }),
    [consent, hydrated, bannerOpen, accept, reject, openPreferences]
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent must be used within a ConsentProvider");
  return ctx;
}
