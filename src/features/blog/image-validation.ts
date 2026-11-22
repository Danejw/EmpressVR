/** Only accept known binary image signatures, not MIME labels supplied by clients. */
export function matchesImageSignature(bytes: Uint8Array, contentType: string): boolean {
  if (bytes.length < 12) return false;
  const ascii = (offset: number, word: string) =>
    Array.from(word).every((char, index) => bytes[offset + index] === char.charCodeAt(0));

  switch (contentType) {
    case "image/png":
      return [137,80,78,71,13,10,26,10].every((value, i) => bytes[i] === value);
    case "image/jpeg":
      return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    case "image/gif":
      return ascii(0, "GIF87a") || ascii(0, "GIF89a");
    case "image/webp":
      return ascii(0, "RIFF") && ascii(8, "WEBP");
    case "image/avif":
      return ascii(4, "ftyp") && (ascii(8, "avif") || ascii(8, "avis"));
    default:
      return false;
  }
}
