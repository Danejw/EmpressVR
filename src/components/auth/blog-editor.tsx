"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import ReactMarkdown from "react-markdown";
import { slugify, type BlogStatus, type BlogInput } from "@/features/blog/validation";
import { formatMarkdown, type MarkdownFormat } from "@/features/blog/markdown-formatting";
import { saveBlogPost } from "@/app/staff/blog/actions";
import type { BlogAuthorOption, BlogImageOption } from "@/features/blog/editor-data";

export type EditableBlog = BlogInput & { id: string; published_at: string | null };

export function BlogEditor({
  initial, authors, images,
}: { initial?: EditableBlog; authors: BlogAuthorOption[]; images: BlogImageOption[] }) {
  const router = useRouter();
  const articleRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [body, setBody] = useState(initial?.body_markdown ?? "");
  const [author, setAuthor] = useState(initial?.author_id ?? "");
  const [cover, setCover] = useState(initial?.featured_media_id ?? "");
  const [status, setStatus] = useState<BlogStatus>(initial?.status === "published" ? "published" : "draft");
  const [media, setMedia] = useState(images);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [id, setId] = useState(initial?.id);
  const currentCover = media.find(item => item.id === cover);
  const slugLocked = Boolean(initial?.published_at);

  function editTitle(value: string) {
    setTitle(value);
    if (!initial && !slugEdited) setSlug(slugify(value));
  }

  function applyFormatting(action: MarkdownFormat) {
    const article = articleRef.current;
    if (!article) return;
    const edit = formatMarkdown(body, article.selectionStart, article.selectionEnd, action);
    setBody(edit.text);
    requestAnimationFrame(() => {
      article.focus();
      article.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    });
  }

  async function save(next: BlogStatus) {
    if (saving) return;
    setSaving(true); setError(""); setNotice("");
    const payload: BlogInput = {
      ...(id ? { id } : {}), title, slug, excerpt, body_markdown: body,
      author_id: author || null, featured_media_id: cover || null, status: next,
    };
    try {
      const result = await saveBlogPost(payload);
      if (!result.ok) { setError(result.error); return; }
      setId(result.id);
      setStatus(next);
      setNotice(next === "published" ? "Post published." : "Draft saved.");
      if (!id) router.replace("/staff/blog/" + result.id);
      router.refresh();
    } catch {
      setError("Could not save the post. Please sign in again if your session expired.");
    } finally { setSaving(false); }
  }

  async function uploadCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png","image/jpeg","image/webp","image/gif","image/avif"].includes(file.type) ||
      file.size > 8 * 1024 * 1024) {
      setError("Choose a PNG, JPEG, WebP, GIF, or AVIF under 8 MB.");
      return;
    }
    setUploading(true); setError(""); setNotice("");
    const data = new FormData();
    data.set("file", file);
    try {
      const response = await fetch("/api/staff/blog-media", { method: "POST", body: data });
      const result: { id?: string; url?: string; error?: string } = await response.json();
      if (!response.ok || !result.id || !result.url) throw new Error(result.error || "Upload failed.");
      setMedia(prev => [{ id: result.id!, url: result.url!, alt: file.name }, ...prev]);
      setCover(result.id);
      setNotice("Image uploaded. Save your post to keep the selection.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload image.");
    } finally { setUploading(false); }
  }

  return <div className="cms-editor">
    <div className="auth-dashboard-heading">
      <div>
        <p className="auth-eyebrow"><Link href="/staff">Dashboard</Link> / <Link href="/staff/blog">Blog</Link></p>
        <h1>{id ? "Edit post" : "New blog post"}</h1>
      </div>
      <span className="cms-status">{status === "published" ? "Published" : "Draft"}</span>
    </div>
    {notice ? <p className="auth-message" role="status">{notice}</p> : null}
    {error ? <p className="auth-error" role="alert">{error}</p> : null}
    <div className="cms-editor-layout">
      <div className="auth-panel">
        <div className="auth-form">
          <label htmlFor="cms-title">Title</label>
          <input id="cms-title" maxLength={160} value={title} onChange={e=>editTitle(e.target.value)} placeholder="Post title" required/>
          <label htmlFor="cms-slug">URL slug</label>
          <input id="cms-slug" maxLength={96} value={slug} disabled={slugLocked}
            onChange={e=>{setSlug(slugify(e.target.value));setSlugEdited(true);}}/>
          <p className="auth-small">/blog/{slug || "your-post"}{slugLocked ? " · Permanent URL" : ""}</p>
          <label htmlFor="cms-excerpt">Excerpt</label>
          <textarea id="cms-excerpt" rows={3} maxLength={400} value={excerpt} onChange={e=>setExcerpt(e.target.value)} placeholder="A short introduction"/>
          <div className="cms-editor-heading">
            <label htmlFor="cms-body">Article</label>
            <button type="button" className="auth-text-button" onClick={()=>setPreview(p=>!p)}>{preview?"Edit article":"Preview article"}</button>
          </div>
          {preview ? <div className="cms-markdown-preview"><ReactMarkdown>{body || "*Nothing to preview yet.*"}</ReactMarkdown></div> :
            <>
              <div className="cms-format-toolbar" role="toolbar" aria-label="Article formatting">
                <button type="button" aria-label="Heading" onClick={()=>applyFormatting("heading")}>H2</button>
                <button type="button" aria-label="Bold" onClick={()=>applyFormatting("bold")}><strong>B</strong></button>
                <button type="button" aria-label="Italic" onClick={()=>applyFormatting("italic")}><em>I</em></button>
                <button type="button" aria-label="Link" onClick={()=>applyFormatting("link")}>Link</button>
                <button type="button" aria-label="List" onClick={()=>applyFormatting("list")}>List</button>
              </div>
              <textarea ref={articleRef} id="cms-body" className="cms-markdown-source" rows={17} value={body}
                onChange={e=>setBody(e.target.value)}
                placeholder="Write your post in Markdown."/>
            </>}
          <p className="auth-small">Markdown formatting is supported. Preview before publishing.</p>
        </div>
      </div>
      <aside className="auth-panel cms-editor-sidebar">
        <h2>Post settings</h2>
        <label htmlFor="cms-author">Author</label>
        <select id="cms-author" value={author} onChange={e=>setAuthor(e.target.value)}>
          <option value="">EmpressVR</option>
          {authors.map(person=><option value={person.id} key={person.id}>{person.name}</option>)}
        </select>
        <label htmlFor="cms-cover">Cover image</label>
        {currentCover ? <img className="cms-cover-preview" src={currentCover.url} alt={currentCover.alt} /> : null}
        <select id="cms-cover" value={cover} onChange={e=>setCover(e.target.value)}>
          <option value="">No image</option>
          {media.map(image=><option key={image.id} value={image.id}>{image.alt || "Image"}</option>)}
        </select>
        <label htmlFor="cms-upload">Upload an image</label>
        <input id="cms-upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          disabled={uploading || saving} onChange={uploadCover}/>
        <p className="auth-small">PNG, JPEG, WebP, GIF or AVIF, up to 8 MB.</p>
        {currentCover ? <button type="button" className="auth-text-button" onClick={()=>{
          setBody(text => text + (text.endsWith("\n") ? "\n" : "\n\n") +
            "![" + currentCover.alt.replaceAll("]","") + "](" + currentCover.url + ")\n");
          setPreview(false);
          setNotice("Image inserted into article. Save your changes.");
        }}>Insert cover into article</button> : null}
        <div className="cms-editor-actions">
          <button type="button" className="pill-button" disabled={saving || uploading} onClick={()=>save(status)}>
            {saving ? "Saving..." : "Save changes"}
          </button>
          {status === "draft" ?
            <button type="button" className="pill-button" disabled={saving || uploading} onClick={()=>save("published")}>Publish</button> :
            <>
              <button type="button" className="auth-text-button" disabled={saving || uploading} onClick={()=>save("draft")}>Unpublish</button>
              <Link href={"/blog/" + slug} className="auth-link">View live post</Link>
            </>}
        </div>
      </aside>
    </div>
  </div>;
}
