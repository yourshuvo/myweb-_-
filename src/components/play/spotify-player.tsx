"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { W98Icon } from "@/components/desktop/w98-icon";
import { normalizeSpotifyPlaylistUrl, spotifyPlaylistUri } from "@/lib/spotify";

const consentKey = "w98:spotify-consent";

type SpotifyController = { destroy: () => void };
type SpotifyIframeApi = {
  createController: (
    element: HTMLElement,
    options: { uri: string; width: string; height: number },
    callback: (controller: SpotifyController) => void,
  ) => void;
};

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
    __w98SpotifyIframeApi?: SpotifyIframeApi;
  }
}

export function SpotifyPlayer({ title, url, compact = false }: { title: string; url: string; compact?: boolean }) {
  const normalizedUrl = normalizeSpotifyPlaylistUrl(url);
  const uri = normalizedUrl ? spotifyPlaylistUri(normalizedUrl) : null;
  const [consented, setConsented] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const mountRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SpotifyController | null>(null);

  useEffect(() => {
    if (window.sessionStorage.getItem(consentKey) !== "1") return;
    const frame = window.requestAnimationFrame(() => setConsented(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const createController = useCallback((api: SpotifyIframeApi) => {
    if (!mountRef.current || !uri || controllerRef.current) return;
    setStatus("loading");
    mountRef.current.replaceChildren();
    api.createController(
      mountRef.current,
      { uri, width: "100%", height: compact ? 152 : 352 },
      (controller) => {
        controllerRef.current = controller;
        setStatus("ready");
      },
    );
  }, [compact, uri]);

  useEffect(() => {
    if (!consented || !uri) return;
    const ready = (api: SpotifyIframeApi) => {
      window.__w98SpotifyIframeApi = api;
      createController(api);
    };
    window.onSpotifyIframeApiReady = ready;
    if (window.__w98SpotifyIframeApi) createController(window.__w98SpotifyIframeApi);
    return () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
      if (window.onSpotifyIframeApiReady === ready) delete window.onSpotifyIframeApiReady;
    };
  }, [consented, createController, uri]);

  if (!normalizedUrl || !uri) {
    return (
      <div className="spotify-empty empty-state">
        <W98Icon icon="media-player" size={32} />
        <strong>No featured playlist yet</strong>
        <p>The owner can add one public Spotify playlist in Profile settings.</p>
      </div>
    );
  }

  const grantConsent = () => {
    window.sessionStorage.setItem(consentKey, "1");
    setStatus("loading");
    setConsented(true);
  };

  return (
    <section className={`spotify-player${compact ? " is-compact" : ""}`} aria-label="Featured Spotify playlist">
      <header>
        <span><W98Icon icon="media-player" size={16} /></span>
        <div><small>Featured playlist</small><h2>{title || "Listen on Spotify"}</h2></div>
      </header>
      {!consented ? (
        <div className="spotify-consent">
          <p>Spotify is a third party. Loading its player may allow Spotify to set cookies or collect device information.</p>
          <button className="retro-button" type="button" onClick={grantConsent}>Load Spotify player</button>
          <div><a href={normalizedUrl} target="_blank" rel="noreferrer">Open playlist on Spotify</a><Link href="/privacy">Read the privacy note</Link></div>
        </div>
      ) : (
        <>
          <Script
            id="spotify-iframe-api"
            src="https://open.spotify.com/embed/iframe-api/v1"
            strategy="afterInteractive"
            onReady={() => window.__w98SpotifyIframeApi && createController(window.__w98SpotifyIframeApi)}
            onError={() => setStatus("error")}
          />
          <div className="spotify-embed-frame" style={{ minHeight: compact ? 152 : 352 }}>
            <div ref={mountRef} />
            {status === "loading" && <p role="status">Loading Spotify player...</p>}
            {status === "error" && <p role="alert">The Spotify player could not load.</p>}
          </div>
          <a className="spotify-fallback" href={normalizedUrl} target="_blank" rel="noreferrer">Open playlist on Spotify</a>
        </>
      )}
    </section>
  );
}
