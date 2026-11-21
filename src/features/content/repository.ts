import index from "./content-index.json";

export type MediaAsset = (typeof index.media_assets)[number];
export type SiteMedia = (typeof index.site_media)[number];
export type Project = (typeof index.projects)[number];
export type TeamMember = (typeof index.team_members)[number];
export type Product = (typeof index.products)[number];
export type EventRecord = (typeof index.events)[number];
export type PageRecord = (typeof index.pages)[number];

const assetsById = new Map(index.media_assets.map(asset => [asset.id, asset]));
const mediaBySourceKey = new Map(index.media_assets.map(asset => [asset.source_key, asset]));
const siteMediaBySlot = new Map(index.site_media.map(slot => [slot.slot, slot.media_asset_id]));

/** This adapter can be replaced by Supabase queries when the project is connected. */
export function getProjects(): Project[] { return [...index.projects].sort((a,b)=>a.sort_order-b.sort_order); }
export function getProducts(): Product[] { return [...index.products].sort((a,b)=>a.sort_order-b.sort_order); }
export function getTeamMembers(): TeamMember[] { return [...index.team_members].sort((a,b)=>a.sort_order-b.sort_order); }
export function getEvents(): EventRecord[] { return [...index.events]; }
export function getBlogPosts() { return [...index.blog_posts]; }
export function getPages(): PageRecord[] { return [...index.pages]; }
export function getMediaAsset(id: string | null | undefined): MediaAsset | undefined {
  return id ? assetsById.get(id) : undefined;
}
export function getMediaBySourceUrl(url: string): MediaAsset | undefined {
  return mediaBySourceKey.get(url.split("?")[0].split("#")[0]);
}
export function getSiteMediaId(slot: string): string | undefined {
  return siteMediaBySlot.get(slot);
}
export function getProjectImages(projectId: string) {
  return index.project_media.filter(item => item.project_id === projectId).sort((a,b)=>a.position-b.position);
}
export function getProductImages(productId: string) {
  return index.product_media.filter(item => item.product_id === productId).sort((a,b)=>a.position-b.position);
}
