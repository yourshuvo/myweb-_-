"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "light";
      size: "flexible";
      appearance: "interaction-only";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": (code: string) => boolean;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function TurnstileWidget({ siteKey, action = "guestbook" }: { siteKey: string; action?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [apiReady, setApiReady] = useState(false);
  const [token, setToken] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!apiReady || !containerRef.current || !window.turnstile) return;
    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      theme: "light",
      size: "flexible",
      appearance: "interaction-only",
      callback: (nextToken) => {
        setErrorCode("");
        setToken(nextToken);
      },
      "expired-callback": () => setToken(""),
      "error-callback": (code) => {
        setToken("");
        setErrorCode(code);
        return true;
      },
    });
    return () => window.turnstile?.remove(widgetId);
  }, [action, apiReady, attempt, siteKey]);

  return (
    <div className="turnstile-field">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setApiReady(true)}
      />
      <div ref={containerRef} className="turnstile-container" />
      <input type="hidden" name="cf-turnstile-response" value={token} readOnly />
      {!apiReady && <p role="status">Loading anti-spam check...</p>}
      {errorCode && (
        <div role="alert">
          <p>The anti-spam check could not finish (error {errorCode}). Try again, or temporarily disable a VPN or content-blocking extension.</p>
          <button className="retro-button" type="button" onClick={() => { setErrorCode(""); setAttempt((value) => value + 1); }}>Retry check</button>
        </div>
      )}
    </div>
  );
}
