import { afterEach, describe, expect, it, vi } from "vitest";
import { getSkyRetention, listSkyImages, parseCapturedAt, resolveAssetUrl, resolveSkyAssetUrl } from "@/lib/skyImages";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sky image manifest", () => {
  it("parses compact Pi timestamps as UTC dates", () => {
    expect(parseCapturedAt("20260524T165716Z").toISOString()).toBe("2026-05-24T16:57:16.000Z");
  });

  it("resolves relative assets beneath the Vite base URL", () => {
    expect(resolveAssetUrl("sky/images/2026/05/a.jpg")).toBe("/sky/images/2026/05/a.jpg");
    expect(resolveSkyAssetUrl("images/2026/05/a.jpg")).toBe("/sky/images/2026/05/a.jpg");
  });

  it("loads, sorts, and maps manifest images", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            version: 1,
            generatedAt: "2026-05-24T17:00:00Z",
            retention: {
              capBytes: 943718400,
              retainedBytes: 1234,
              retainedCount: 2,
              sourceCount: 2,
              prunedCount: 0,
            },
            sprites: {
              tileSize: 64,
              columns: 16,
              weeks: [
                {
                  key: "2026-W21",
                  url: "sky/sprites/2026/2026-W21.jpg",
                  rows: 1,
                  width: 1024,
                  height: 64,
                  count: 2,
                  bytes: 2048,
                },
              ],
            },
            images: [
              {
                id: "20260524T165716Z",
                imageUrl: "sky/images/2026/05/new.jpg",
                thumbUrl: "sky/thumbs/2026/05/new.jpg",
                sprite: { key: "2026-W21", index: 1 },
                averageHex: "#abcdef",
              },
              {
                id: "20260524T155706Z",
                imageUrl: "sky/images/2026/05/old.jpg",
                sprite: { key: "2026-W21", index: 0 },
                averageHex: "#123456",
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const images = await listSkyImages(true);
    expect(images.map((image) => image.id)).toEqual(["20260524T155706Z", "20260524T165716Z"]);
    expect(images[0].thumbUrl).toBe("/sky/images/2026/05/old.jpg");
    expect(images[1].thumbUrl).toBe("/sky/thumbs/2026/05/new.jpg");
    expect(images[0].sprite?.url).toBe("/sky/sprites/2026/2026-W21.jpg");
    expect(images[1].sprite?.index).toBe(1);
    expect(getSkyRetention()?.retainedCount).toBe(2);
  });

  it("rejects unsupported manifest shapes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ version: 2, images: [] }), { headers: { "content-type": "application/json" } })),
    );

    await expect(listSkyImages(true)).rejects.toThrow("unsupported shape");
  });
});
