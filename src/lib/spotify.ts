const spotifyPlaylistPath = /^\/playlist\/([A-Za-z0-9]+)\/?$/;

export function normalizeSpotifyPlaylistUrl(value: string) {
  const input = value.trim();
  if (!input) return "";

  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.hostname !== "open.spotify.com" || url.username || url.password) {
      return null;
    }
    const match = url.pathname.match(spotifyPlaylistPath);
    if (!match) return null;
    return `https://open.spotify.com/playlist/${match[1]}`;
  } catch {
    return null;
  }
}

export function spotifyPlaylistUri(value: string) {
  const normalized = normalizeSpotifyPlaylistUrl(value);
  if (!normalized) return null;
  return `spotify:playlist:${normalized.split("/").at(-1)}`;
}
