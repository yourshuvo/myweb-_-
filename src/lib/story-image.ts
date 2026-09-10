export const STORY_IMAGE_WIDTH = 1080;
export const STORY_IMAGE_HEIGHT = 1920;

export function storyFontSizeForLength(length: number) {
  if (length <= 90) return 68;
  if (length <= 180) return 58;
  if (length <= 300) return 49;
  if (length <= 400) return 43;
  return 38;
}

export function storyLineHeight(fontSize: number) {
  return Math.round(fontSize * 1.24);
}

export function anonymousStoryFilename(id: string) {
  return `anonymous-message-${id.slice(0, 8)}.png`;
}
