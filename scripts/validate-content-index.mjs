import {readFileSync,existsSync} from "node:fs";
const data=JSON.parse(readFileSync("src/features/content/content-index.json","utf8"));
const errors=[];
const check=(ok,msg)=>{if(!ok)errors.push(msg)};
const ids=arr=>new Set(arr.map(x=>x.id));
const pages=ids(data.pages),media=ids(data.media_assets),projects=ids(data.projects),products=ids(data.products);
check(data.pages.length===48,"Expected 48 original page snapshots");
check(data.media_assets.length>=158,"Expected 158+ Squarespace media references");
for(const item of data.media_assets){
  check(/^[-0-9a-f]{36}$/.test(item.id),"Invalid media ID "+item.id);
  check(item.source_url.startsWith("https://images.squarespace-cdn.com/"),"Untrusted image URL "+item.id);
  if(item.status==="imported")check(Boolean(item.storage_key&&existsSync("public/"+item.storage_key)),"Missing local image "+item.id);
}
for(const item of data.page_media)check(pages.has(item.page_id)&&media.has(item.media_asset_id),"Broken page media "+item.id);
for(const item of data.project_media)check(projects.has(item.project_id)&&media.has(item.media_asset_id),"Broken project media "+item.id);
for(const item of data.product_media)check(products.has(item.product_id)&&media.has(item.media_asset_id),"Broken product media "+item.id);
for(const item of data.site_media)check(media.has(item.media_asset_id),"Missing static slot media "+item.slot);
for(const item of [...data.projects,...data.products])
  check(!item.featured_media_id||media.has(item.featured_media_id),"Missing featured image "+item.slug);
for(const item of data.team_members)
  check(!item.headshot_media_id||media.has(item.headshot_media_id),"Missing team image "+item.name);
for(const msg of errors)console.error("Content validation:",msg);
console.log("Content validation:",data.pages.length,"pages,",data.media_assets.length,"indexed images,",
  data.media_assets.filter(x=>x.status==="imported").length,"imported,",errors.length,"errors");
if(errors.length)process.exitCode=1;
