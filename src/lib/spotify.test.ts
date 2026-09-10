import { describe, expect, it } from "vitest";
import { normalizeSpotifyPlaylistUrl, spotifyPlaylistUri } from "@/lib/spotify";

describe("Spotify playlist URLs", () => {
  it("normalizes a playlist URL and strips tracking parameters", () => {
    expect(normalizeSpotifyPlaylistUrl("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc#x"))
      .toBe("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M");
  });

  it("rejects non-playlist and lookalike URLs", () => {
    expect(normalizeSpotifyPlaylistUrl("https://open.spotify.com/album/123")).toBeNull();
    expect(normalizeSpotifyPlaylistUrl("https://open.spotify.com.evil.example/playlist/123")).toBeNull();
    expect(normalizeSpotifyPlaylistUrl("javascript:alert(1)")).toBeNull();
  });

  it("creates the iframe API URI", () => {
    expect(spotifyPlaylistUri("https://open.spotify.com/playlist/abc123")).toBe("spotify:playlist:abc123");
  });
});
