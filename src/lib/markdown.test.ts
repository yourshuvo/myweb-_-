import { describe, expect, it } from "vitest";
import { extractHackClubMediaUrls, isSafeHref } from "@/lib/markdown";

describe("Markdown safety", () => {
  it("allows local, secure, and email links", () => {
    expect(isSafeHref("/about")).toBe(true);
    expect(isSafeHref("https://example.com")).toBe(true);
    expect(isSafeHref("mailto:hello@example.com")).toBe(true);
  });
  it("rejects script and insecure links", () => {
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref("http://example.com")).toBe(false);
  });
});

describe("managed media references", () => {
  it("extracts only Hack Club CDN Markdown images", () => {
    const markdown = "![day](https://cdn.hackclub.com/abc/day.jpg)\n![other](https://example.com/no.jpg)";
    expect(extractHackClubMediaUrls(markdown)).toEqual(["https://cdn.hackclub.com/abc/day.jpg"]);
  });
});
