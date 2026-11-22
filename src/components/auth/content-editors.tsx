"use client";
import Link from "next/link";
import { AppSelect } from "@/components/ui/app-select";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import { slugify, type ProjectInput, type TeamInput } from "@/features/staff/content-validation";
import type { ContentImage } from "@/features/staff/editor-options";
import { saveProject, saveTeam } from "@/app/staff/content/actions";

type ImagesProps = {
  images: ContentImage[]; value: string; label: string;
  onChange: (value: string) => void;
  onUploaded: (image: ContentImage) => void;
};
function ImageSelect({ images, value, label, onChange, onUploaded }: ImagesProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const selected = images.find(image => image.id === value);
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true); setError("");
    const data = new FormData();
    data.set("file", file);
    try {
      const response = await fetch("/api/staff/content-media", { method: "POST", body: data });
      const result: { id?: string; url?: string; error?: string } = await response.json();
      if (!response.ok || !result.id || !result.url) throw new Error(result.error ?? "Upload failed.");
      onUploaded({ id: result.id, url: result.url, alt: file.name });
      onChange(result.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Image upload failed.");
    } finally { setUploading(false); }
  }
  return <div className="cms-image-select">
    <label htmlFor={"image-" + label}>{label}</label>
    {selected ? <img src={selected.url} alt={selected.alt} className="cms-image-preview" /> : null}
    <AppSelect id={"image-" + label} value={value} onChange={onChange} searchable
      searchPlaceholder="Search images"
      options={[{value:"",label:"No image"},...images.map(image=>({value:image.id,label:image.alt}))]}/>
    <label className="cms-upload-label" htmlFor={"upload-" + label}>Upload image</label>
    <input id={"upload-" + label} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
      disabled={uploading} onChange={upload}/>
    {uploading ? <p role="status">Uploading...</p> : null}
    {error ? <p role="alert" className="auth-error">{error}</p> : null}
  </div>;
}

export function ProjectEditor({ initial, images: options }: { initial?: ProjectInput; images: ContentImage[] }) {
  const router = useRouter();
  const [id, setId] = useState(initial?.id);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [body, setBody] = useState(initial?.page_body_markdown ?? "");
  const [status, setStatus] = useState<ProjectInput["status"]>(initial?.status ?? "draft");
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [cover, setCover] = useState(initial?.featured_media_id ?? "");
  const [gallery, setGallery] = useState(initial?.gallery_media_ids ?? []);
  const [galleryChoice, setGalleryChoice] = useState("");
  const [images, setImages] = useState(options);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  function editTitle(value: string) {
    setTitle(value);
    if (!id && !slugEdited) setSlug(slugify(value));
  }
  async function save() {
    if (saving) return;
    if (status === "archived" && initial?.status !== "archived" &&
        !window.confirm("Archive this project and remove it from the public projects list?")) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const value: ProjectInput = {
        ...(id ? { id } : {}), title, slug, subtitle, status, sort_order: sortOrder,
        featured_media_id: cover || null, gallery_media_ids: gallery, page_body_markdown: body,
      };
      const result = await saveProject(value);
      if (!result.ok) { setError(result.error); return; }
      setId(result.id); setNotice("Project saved.");
      if (!id) router.replace("/staff/projects/" + result.id);
      router.refresh();
    } catch { setError("Could not save project."); }
    finally { setSaving(false); }
  }
  return <div className="cms-editor">
    <div className="auth-dashboard-heading">
      <div><p className="auth-eyebrow"><Link href="/staff">Dashboard</Link> / <Link href="/staff/projects">Projects</Link></p>
        <h1>{id ? "Edit project" : "New project"}</h1></div>
      <span className="cms-status">{status}</span>
    </div>
    {error ? <p role="alert" className="auth-error">{error}</p> : null}
    {notice ? <p role="status" className="auth-message">{notice}</p> : null}
    <div className="cms-editor-layout">
      <div className="auth-panel"><div className="auth-form">
        <label htmlFor="project-title">Title</label>
        <input id="project-title" required maxLength={160} value={title} onChange={e => editTitle(e.target.value)}/>
        <label htmlFor="project-slug">URL slug</label>
        <input id="project-slug" required maxLength={96} disabled={Boolean(id)} value={slug}
          onChange={e => { setSlug(slugify(e.target.value)); setSlugEdited(true); }}/>
        <p className="auth-small">/projects/{slug || "project"}</p>
        <label htmlFor="project-subtitle">Subtitle</label>
        <textarea id="project-subtitle" rows={3} maxLength={600} value={subtitle} onChange={e => setSubtitle(e.target.value)}/>
        <label htmlFor="project-description">Description (Markdown)</label>
        <textarea id="project-description" rows={12} maxLength={100000} value={body} onChange={e => setBody(e.target.value)}/>
        <p className="auth-small">Existing linked pages retain their original URLs.</p>
      </div></div>
      <aside className="auth-panel cms-editor-sidebar">
        <h2>Project settings</h2>
        <label htmlFor="project-status">Visibility</label>
        <AppSelect id="project-status" value={status}
          onChange={value=>setStatus(value as ProjectInput["status"])}
          options={[{value:"draft",label:"Draft"},{value:"published",label:"Published"},
            {value:"archived",label:"Archived"}]}/>
        <label htmlFor="project-order">Sort order</label>
        <input id="project-order" type="number" min={0} max={10000} step={1} value={sortOrder}
          onChange={e => setSortOrder(Number(e.target.value))}/>
        <ImageSelect label="Featured image" images={images} value={cover} onChange={setCover}
          onUploaded={image => setImages(prev => [image, ...prev])}/>
        <h2>Gallery</h2>
        <div className="cms-gallery-picker">
          <label htmlFor="project-gallery-add">Add from media library</label>
          <AppSelect id="project-gallery-add" value={galleryChoice} onChange={setGalleryChoice} searchable
            searchPlaceholder="Search images"
            options={[{value:"",label:"Select an image"},...images.filter(image=>!gallery.includes(image.id))
              .map(image=>({value:image.id,label:image.alt}))]}/>
          <button type="button" className="auth-text-button" disabled={!galleryChoice || gallery.length >= 30}
            onClick={() => {setGallery(prev => [...prev, galleryChoice]); setGalleryChoice("");}}>Add image</button>
          {gallery.map((imageId, index) => {
            const image = images.find(item => item.id === imageId);
            return <div className="cms-gallery-item" key={imageId}>
              <span>{index + 1}. {image?.alt ?? "Existing image"}</span>
              <button type="button" className="auth-text-button" disabled={index === 0}
                onClick={() => setGallery(prev => {const next = [...prev];[next[index - 1], next[index]] = [next[index],next[index - 1]];return next;})}>Up</button>
              <button type="button" className="auth-text-button"
                onClick={() => setGallery(prev => prev.filter(item => item !== imageId))}>Remove</button>
            </div>;
          })}
        </div>
        <button className="pill-button cms-save-button" type="button" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving..." : "Save project"}
        </button>
        {id && status === "published" ? <Link className="auth-link" href={"/projects/" + slug}>View project</Link> : null}
      </aside>
    </div>
  </div>;
}

export function TeamEditor({ initial, images: options }: { initial?: TeamInput; images: ContentImage[] }) {
  const router = useRouter();
  const [id, setId] = useState(initial?.id);
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [roles, setRoles] = useState((initial?.roles ?? []).join("\n"));
  const [group, setGroup] = useState<TeamInput["group_name"]>(initial?.group_name ?? "current");
  const [externalUrl, setExternalUrl] = useState(initial?.external_url ?? "");
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [headshot, setHeadshot] = useState(initial?.headshot_media_id ?? "");
  const [body, setBody] = useState(initial?.page_body_markdown ?? "");
  const [images, setImages] = useState(options);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  function editName(value: string) {
    setName(value);
    if (!id && !slugEdited) setSlug(slugify(value));
  }
  async function save() {
    if (saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const value: TeamInput = {
        ...(id ? { id } : {}), name, slug, roles: roles.split("\n").map(x => x.trim()).filter(Boolean),
        group_name: group, external_url: externalUrl.trim() || null,
        headshot_media_id: headshot || null, sort_order: sortOrder, page_body_markdown: body,
      };
      const result = await saveTeam(value);
      if (!result.ok) { setError(result.error); return; }
      setId(result.id); setNotice("Team profile saved. Changes are public.");
      if (!id) router.replace("/staff/team/" + result.id);
      router.refresh();
    } catch { setError("Could not save team profile."); }
    finally { setSaving(false); }
  }
  return <div className="cms-editor">
    <div className="auth-dashboard-heading"><div>
      <p className="auth-eyebrow"><Link href="/staff">Dashboard</Link> / <Link href="/staff/team">Team</Link></p>
      <h1>{id ? "Edit team profile" : "New team profile"}</h1>
    </div></div>
    {error ? <p role="alert" className="auth-error">{error}</p> : null}
    {notice ? <p role="status" className="auth-message">{notice}</p> : null}
    <div className="cms-editor-layout"><div className="auth-panel"><div className="auth-form">
      <label htmlFor="team-name">Name</label>
      <input id="team-name" required maxLength={160} value={name} onChange={e => editName(e.target.value)}/>
      <label htmlFor="team-slug">Profile URL slug</label>
      <input id="team-slug" required maxLength={96} disabled={Boolean(id && initial?.slug)}
        value={slug} onChange={e => {setSlug(slugify(e.target.value));setSlugEdited(true);}}/>
      <p className="auth-small">/team/{slug || "name"}</p>
      <label htmlFor="team-roles">Public roles (one per line)</label>
      <textarea id="team-roles" rows={4} value={roles} onChange={e => setRoles(e.target.value)}/>
      <label htmlFor="team-url">External link (optional)</label>
      <input id="team-url" type="url" maxLength={500} value={externalUrl} placeholder="https://"
        onChange={e => setExternalUrl(e.target.value)}/>
      <label htmlFor="team-bio">Biography (Markdown)</label>
      <textarea id="team-bio" rows={12} maxLength={100000} value={body} onChange={e => setBody(e.target.value)}/>
    </div></div>
    <aside className="auth-panel cms-editor-sidebar">
      <h2>Profile settings</h2>
      <label htmlFor="team-group">Team group</label>
      <AppSelect id="team-group" value={group}
        onChange={value=>setGroup(value as TeamInput["group_name"])}
        options={[{value:"current",label:"Current"},{value:"other",label:"Other"},
          {value:"past",label:"Past"}]}/>
      <label htmlFor="team-order">Sort order</label>
      <input id="team-order" type="number" min={0} max={10000} step={1}
        value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))}/>
      <ImageSelect label="Headshot" images={images} value={headshot} onChange={setHeadshot}
        onUploaded={image => setImages(prev => [image, ...prev])}/>
      <p className="auth-small">Team profiles appear publicly immediately after saving. Move former members to Past.</p>
      <button className="pill-button cms-save-button" type="button" disabled={saving} onClick={() => void save()}>
        {saving ? "Saving..." : "Save profile"}
      </button>
      {id ? <Link className="auth-link" href={"/team/" + slug}>View profile</Link> : null}
    </aside></div>
  </div>;
}
