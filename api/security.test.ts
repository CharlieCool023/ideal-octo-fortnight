import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { normalizePassportPhotoDataUrl } from "../src-api/lib/image-validation";
import { consumeRateLimit, getClientAddress } from "../src-api/lib/rate-limit";

describe("passport photo validation", () => {
  it("decodes and normalizes a valid JPEG", async () => {
    const jpeg = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "white" },
    }).jpeg().toBuffer();

    const normalized = await normalizePassportPhotoDataUrl(
      `data:image/jpeg;base64,${jpeg.toString("base64")}`,
    );

    expect(normalized).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("rejects a spoofed data URL, non-JPEG content, and oversized data", async () => {
    await expect(normalizePassportPhotoDataUrl("data:image/jpeg;base64,SGVsbG8="))
      .resolves.toBeNull();
    await expect(normalizePassportPhotoDataUrl("data:image/png;base64,SGVsbG8="))
      .resolves.toBeNull();
    await expect(normalizePassportPhotoDataUrl(`data:image/jpeg;base64,${"A".repeat(20_000)}`))
      .resolves.toBeNull();
  });
});

describe("request rate limiting", () => {
  it("blocks after the configured number of requests and resets after the window", () => {
    const key = `test:${crypto.randomUUID()}`;

    expect(consumeRateLimit(key, 2, 1_000, 10_000).allowed).toBe(true);
    expect(consumeRateLimit(key, 2, 1_000, 10_001).allowed).toBe(true);
    expect(consumeRateLimit(key, 2, 1_000, 10_002)).toEqual({
      allowed: false,
      retryAfterSeconds: 1,
    });
    expect(consumeRateLimit(key, 2, 1_000, 11_000).allowed).toBe(true);
  });

  it("uses the last forwarded address added by the trusted proxy", () => {
    const headers = new Headers({ "x-forwarded-for": "spoofed, 198.51.100.25" });
    expect(getClientAddress(headers)).toBe("198.51.100.25");
  });
});
