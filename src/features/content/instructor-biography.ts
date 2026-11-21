/**
 * John Howard's published profile is the source of truth for his biography.
 * The Education page keeps its existing photo and heading, and borrows only
 * the profile's biography body. Never maintain a second copy of his bio here.
 */
function biographyBody(profile: string): string {
  return profile
    .replace(/^\s*!\[[^\]]*\]\([^\n)]+\)\s*/, "")
    .replace(/^#{1,3}\s+John Howard[^\n]*\s*/i, "")
    .replace(/^(?:\* \* \*|---)\s*/m, "")
    .replace(/[\u00ad\u200b\u200c\u200d]/g, "")
    .trim();
}

export function educationWithJohnBiography(
  education: string,
  publishedProfile: string | null,
): string {
  const heading = /^## John Howard - Cyrnus\s*$/m;
  const match = heading.exec(education);
  if (!match) return education;

  // Replace the captured, blank instructor section while preserving later content.
  const afterHeading = match.index + match[0].length;
  const remainder = education.slice(afterHeading);
  const nextHeadingOffset = remainder.search(/^## /m);
  const end = nextHeadingOffset >= 0
    ? afterHeading + nextHeadingOffset : education.length;
  const biography = publishedProfile ? biographyBody(publishedProfile) : "";
  const following = education.slice(end).trimStart();
  return [
    education.slice(0, afterHeading).trimEnd(),
    biography,
    following,
  ].filter(Boolean).join("\n\n").trim();
}
