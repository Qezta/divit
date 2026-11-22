import { describe, expect, it } from "vitest";

import { knowledgeBase } from "./knowledge-base";

// The chatbot's answers are only as good as these chunks: rag.ts scores on content, title and
// keywords, and always pins the `identity` chunk, so a missing or empty field silently degrades
// retrieval instead of failing loudly.
describe("knowledgeBase", () => {
  it("has unique ids", () => {
    const ids = knowledgeBase.map((c) => c.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("contains the identity chunk retrieval always pins", () => {
    expect(knowledgeBase.some((c) => c.id === "identity")).toBe(true);
  });

  it.each(knowledgeBase.map((c) => [c.id, c] as const))(
    "%s is complete",
    (_, chunk) => {
      expect(chunk.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(chunk.title.trim()).not.toBe("");
      expect(chunk.content.trim().length).toBeGreaterThan(50);
      expect(chunk.keywords.length).toBeGreaterThan(0);
    },
  );

  it.each(knowledgeBase.map((c) => [c.id, c] as const))(
    "%s has usable keywords",
    (_, chunk) => {
      for (const keyword of chunk.keywords) {
        // keywords are matched as substrings of the lowercased query
        expect(keyword.trim()).toBe(keyword);
        expect(keyword.length).toBeGreaterThan(1);
      }
      const lower = chunk.keywords.map((k) => k.toLowerCase());
      expect(new Set(lower).size).toBe(lower.length);
    },
  );

  it("keeps the whole base small enough for the getAllContext fallback prompt", () => {
    const chars = knowledgeBase.reduce(
      (n, c) => n + c.title.length + c.content.length,
      0,
    );

    expect(chars).toBeLessThan(100_000);
  });
});
