import {describe,it,expect} from "vitest";
import {existsSync} from "node:fs";
import index from "./content-index.json";
import {getSiteMediaId,getMediaAsset,getProjects,getTeamMembers,getProducts,getMediaBySourceUrl} from "./repository";

describe("EmpressVR structured content and local media",()=>{
  it("preserves the original inventory with separate content collections",()=>{
    expect(index.pages).toHaveLength(48);
    expect(getProjects()).toHaveLength(7);
    expect(getTeamMembers()).toHaveLength(9);
    expect(getProducts()).toHaveLength(4);
    expect(index.events).toHaveLength(7);
    expect(index.blog_posts).toHaveLength(0);
  });
  it("has no unresolved or missing local images",()=>{
    expect(index.media_assets).toHaveLength(160);
    for(const media of index.media_assets){
      expect(media.status).toBe("imported");
      expect(media.storage_key).toMatch(/^media\/[a-f0-9]{64}\.(webp|gif)$/);
      expect(existsSync("public/"+media.storage_key)).toBe(true);
      expect(getMediaAsset(media.id)?.source_key).toBe(media.source_key);
      expect(getMediaBySourceUrl(media.source_url)?.id).toBe(media.id);
    }
  });
  it("uses explicit image IDs rather than relying on image order",()=>{
    for(const slot of ["site.logo.dark","site.logo.light","home.fundraiser","home.hero","home.techalchemy","home.community","home.tarot","team.join"]){
      const asset=getMediaAsset(getSiteMediaId(slot));
      expect(asset?.status).toBe("imported");
    }
    for(const project of getProjects())expect(getMediaAsset(project.featured_media_id)?.status).toBe("imported");
    for(const product of getProducts())expect(getMediaAsset(product.featured_media_id)?.status).toBe("imported");
    for(const member of getTeamMembers().filter(m=>m.headshot_media_id))
      expect(getMediaAsset(member.headshot_media_id)?.status).toBe("imported");
  });
});
