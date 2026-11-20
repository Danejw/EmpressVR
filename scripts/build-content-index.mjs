import {readFileSync,readdirSync,writeFileSync,existsSync} from "node:fs";
import {createHash} from "node:crypto";
import {join} from "node:path";

const contentDir="src/content/legacy";
const files=Object.fromEntries(readdirSync(contentDir).filter(n=>n.endsWith(".md")).map(n=>[n,readFileSync(join(contentDir,n),"utf8")]));
const catalog=JSON.parse(readFileSync("src/features/content/catalog.json","utf8"));
const logos=JSON.parse(readFileSync("src/features/content/logo-sources.json","utf8"));
const dest="src/features/content/content-index.json";
const old=existsSync(dest)?JSON.parse(readFileSync(dest,"utf8")):null;
const oldAssets=new Map((old?.media_assets||[]).map(m=>[m.source_key,m]));
const uuid=(type,key)=>{
  const h=createHash("sha256").update(type+"|"+key).digest("hex");
  return h.slice(0,8)+"-"+h.slice(8,12)+"-8"+h.slice(13,16)+"-a"+h.slice(17,20)+"-"+h.slice(20,32);
};
const canonical=url=>url.split("?")[0].split("#")[0];
const imageRefs=md=>[...md.matchAll(/!\[([^\]]*)\]\((https:\/\/images\.squarespace-cdn\.com\/[^)\s]+)\)/g)].map(m=>({alt:m[1],url:m[2]}));
const assets=new Map();
function addMedia(url,alt=""){
  const key=canonical(url),id=uuid("media",key),existing=oldAssets.get(key);
  if(!assets.has(key))assets.set(key,{id,source_key:key,source_url:existing?.source_url||url,
    storage_key:existing?.storage_key||null,alt_text:existing?.alt_text||alt||"",
    mime_type:existing?.mime_type||null,width:existing?.width||null,height:existing?.height||null,
    byte_size:existing?.byte_size||null,sha256:existing?.sha256||null,
    status:existing?.status==="imported"?"imported":"remote"});
  else if(alt&&!assets.get(key).alt_text)assets.get(key).alt_text=alt;
  return id;
}
const page_media=[];
const pages=Object.entries(files).sort(([a],[b])=>a.localeCompare(b)).map(([name,body])=>{
  const slug=name.slice(0,-3),path=slug==="home"?"/":"/"+slug.replaceAll("__","/");
  const id=uuid("page",path);
  imageRefs(body).forEach((img,position)=>page_media.push({
    id:uuid("page_media",path+"|"+position+"|"+canonical(img.url)),
    page_id:id,media_asset_id:addMedia(img.url,img.alt),position,role:"body"}));
  return {id,path,source_key:slug,title:(body.match(/^#{1,3}\s+([^\n]+)/m)?.[1]||slug.split("__").at(-1).replaceAll("-"," ")).replaceAll("*","").trim(),
    body_source:"src/content/legacy/"+name,published:true};
});
if(pages.length!==48)throw Error("Expected 48 source snapshots; found "+pages.length);
const pageId=path=>pages.find(p=>p.path===path)?.id||null;
const home=imageRefs(files["home.md"]||"");
const site_media=[];
for(const [i,slot] of ["home.fundraiser","home.hero","home.techalchemy","home.community","home.tarot"].entries()){
  if(!home[i])throw Error("Missing image for "+slot);
  site_media.push({slot,media_asset_id:addMedia(home[i].url,home[i].alt)});
}
for(const [slot,url] of Object.entries(logos))site_media.push({slot,media_asset_id:addMedia(url,"EmpressVR logo")});
const covers=imageRefs(files["projects.md"]||"");
const projects=catalog.projects.map((p,i)=>({
  id:uuid("project",p.slug),page_id:pageId("/"+p.slug),...p,sort_order:i,status:"published",
  featured_media_id:covers[i]?addMedia(covers[i].url,p.title):null
}));
const project_media=projects.flatMap(p=>imageRefs(files[p.slug+".md"]||"").map((img,position)=>({
  id:uuid("project_media",p.slug+"|"+position+"|"+canonical(img.url)),
  project_id:p.id,media_asset_id:addMedia(img.url,img.alt),position
})));
const portraits=imageRefs(files["who-we-are.md"]||"");
const team_members=catalog.team_members.map((m,i)=>{
  const photoIndex=m.group==="current"?i:m.group==="past"?(m.name==="Harrison Willmott"?6:7):null;
  return {id:uuid("team",m.name),name:m.name,slug:m.slug||null,external_url:m.external_url||null,
    roles:m.roles,group:m.group,sort_order:i,page_id:m.slug?pageId("/"+m.slug):null,
    headshot_media_id:photoIndex!==null&&portraits[photoIndex]?addMedia(portraits[photoIndex].url,m.name):null};
});
if(portraits[5])site_media.push({slot:"team.join",media_asset_id:addMedia(portraits[5].url,"Join the Co-op")});
const store=files["store.md"]||"";
const products=catalog.products.map((p,i)=>{
  const marker="["+p.title+"](https://www.empressvr.com/store/p/"+p.slug+")";
  const from=store.indexOf(marker),next=catalog.products[i+1];
  const to=next?store.indexOf("["+next.title+"](",from+marker.length):-1;
  const cover=imageRefs(from>=0?store.slice(from,to>=0?to:undefined):"")[0];
  return {id:uuid("product",p.slug),page_id:pageId("/store/p/"+p.slug),
    ...p,currency:"GBP",sort_order:i,status:p.sold_out?"sold_out":"active",
    featured_media_id:cover?addMedia(cover.url,p.title):null};
});
const product_media=products.flatMap(p=>imageRefs(files["store__p__"+p.slug+".md"]||"").map((img,position)=>({
  id:uuid("product_media",p.slug+"|"+position+"|"+canonical(img.url)),
  product_id:p.id,media_asset_id:addMedia(img.url,img.alt),position
})));
const events=Object.entries(files).filter(([name])=>name.startsWith("community-events__")).sort(([a],[b])=>a.localeCompare(b)).map(([name,body])=>{
  const slug=name.slice("community-events__".length,-3);
  const title=(body.match(/^#{1,3}\s+(.*)$/m)?.[1]||slug.replaceAll("-"," ")).replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").replaceAll("*","").trim();
  return {id:uuid("event",slug),page_id:pageId("/community-events/"+slug),slug,title,
    start_at:null,end_at:null,status:"archived",date_review_required:true};
});
const data={schema_version:1,pages,projects,team_members,products,events,blog_posts:[],
  media_assets:[...assets.values()].sort((a,b)=>a.id.localeCompare(b.id)),site_media,
  page_media,project_media,product_media};
writeFileSync(dest,JSON.stringify(data,null,2)+"\n");
console.log("Content index:",pages.length,"pages,",projects.length,"projects,",team_members.length,"team,",
  products.length,"products,",events.length,"events,",data.media_assets.length,"media assets");
