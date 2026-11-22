import { describe, expect, it } from "vitest";
import { matchesImageSignature } from "./image-validation";

function bytes(head: number[], trailing = 12) {
  return Uint8Array.from([...head, ...Array(trailing).fill(0)]);
}

describe("staff image validation", () => {
  it("accepts supported formats with matching signatures", () => {
    expect(matchesImageSignature(bytes([137,80,78,71,13,10,26,10]), "image/png")).toBe(true);
    expect(matchesImageSignature(bytes([255,216,255]), "image/jpeg")).toBe(true);
    expect(matchesImageSignature(bytes([71,73,70,56,57,97]), "image/gif")).toBe(true);
    expect(matchesImageSignature(bytes([82,73,70,70,0,0,0,0,87,69,66,80]), "image/webp")).toBe(true);
    expect(matchesImageSignature(bytes([0,0,0,20,102,116,121,112,97,118,105,102]), "image/avif")).toBe(true);
  });
  it("rejects files whose contents do not match the claimed format", () => {
    expect(matchesImageSignature(bytes([60,104,116,109,108]), "image/png")).toBe(false);
    expect(matchesImageSignature(bytes([137,80,78,71,13,10,26,10]), "image/webp")).toBe(false);
    expect(matchesImageSignature(bytes([137,80,78,71,13,10,26,10]), "image/svg+xml")).toBe(false);
    expect(matchesImageSignature(new Uint8Array(0), "image/jpeg")).toBe(false);
  });
});
