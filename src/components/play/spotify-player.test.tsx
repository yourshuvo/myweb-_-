// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { beforeEach, describe, expect, it } from "vitest";
import { SpotifyPlayer } from "@/components/play/spotify-player";

afterEach(() => {
  cleanup();
  document.querySelectorAll('script[src*="spotify"]').forEach((element) => element.remove());
  window.sessionStorage.clear();
  delete window.__w98SpotifyIframeApi;
  delete window.onSpotifyIframeApiReady;
});

describe("Spotify consent gate", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("does not load Spotify until the visitor opts in", async () => {
    render(<SpotifyPlayer title="Test playlist" url="https://open.spotify.com/playlist/abc123" />);
    expect(document.querySelector('script[src*="spotify"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Load Spotify player" }));
    await waitFor(() => expect(window.sessionStorage.getItem("w98:spotify-consent")).toBe("1"));
    expect(screen.getByRole("link", { name: "Open playlist on Spotify" })).toBeTruthy();
  });

  it("shows an honest setup state without a configured playlist", () => {
    render(<SpotifyPlayer title="" url="" />);
    expect(screen.getByText("No featured playlist yet")).toBeTruthy();
    expect(document.querySelector('script[src*="spotify"]')).toBeNull();
  });
});
