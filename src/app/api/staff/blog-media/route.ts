import { NextRequest, NextResponse } from "next/server";
import { getStaffContext } from "@/lib/auth/staff";
import { matchesImageSignature } from "@/features/blog/image-validation";

const imageTypes = new Map([
  ["image/png", "png"], ["image/jpeg", "jpg"], ["image/webp", "webp"],
  ["image/gif", "gif"], ["image/avif", "avif"],
]);
const maxBytes = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const staff = await getStaffContext();
  if (!staff?.role || !staff.mfaVerified)
    return NextResponse.json({ error: "Staff access and MFA required." }, { status: 403 });

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > maxBytes + 8192)
    return NextResponse.json({ error: "Image is too large." }, { status: 413 });
  let body: FormData;
  try { body = await request.formData(); }
  catch { return NextResponse.json({ error: "Invalid upload." }, { status: 400 }); }
  const file = body.get("file");
  if (!(file instanceof File) || !imageTypes.has(file.type) || !file.size || file.size > maxBytes)
    return NextResponse.json({ error: "Upload a PNG, JPEG, WebP, GIF or AVIF under 8 MB." }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesImageSignature(bytes, file.type))
    return NextResponse.json({ error: "File contents do not match the image format." }, { status: 400 });

  const id = crypto.randomUUID();
  const key = "blog/" + id + "." + imageTypes.get(file.type);
  const { auth } = staff;
  const { error: uploadError } = await auth.storage.from("site-media").upload(key, file, {
    upsert: false, contentType: file.type, cacheControl: "3600",
  });
  if (uploadError) return NextResponse.json({ error: "Image upload failed." }, { status: 400 });
  const { data: publicLink } = auth.storage.from("site-media").getPublicUrl(key);
  const { error: metadataError } = await auth.from("media_assets").insert({
    id, source_key: "blog:" + id, source_url: publicLink.publicUrl,
    storage_key: key, alt_text: file.name.slice(0, 200),
    mime_type: file.type, byte_size: file.size, status: "imported",
  });
  if (metadataError) {
    await auth.storage.from("site-media").remove([key]);
    return NextResponse.json({ error: "Could not register the image." }, { status: 400 });
  }
  return NextResponse.json({ id, url: publicLink.publicUrl }, { status: 201 });
}
