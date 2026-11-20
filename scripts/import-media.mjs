import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {join,dirname} from "node:path";
import {createHash} from "node:crypto";
import sharp from "sharp";

const indexPath="src/features/content/content-index.json";
const data=JSON.parse(readFileSync(indexPath,"utf8"));
const report={attempted:0,imported:0,already_imported:0,bytes_written:0,failed:[]};
const existing=new Map(data.media_assets.filter(m=>m.status==="imported"&&m.sha256).map(m=>[m.sha256,m.storage_key]));
const maxBytes=22*1024*1024;
async function retrieve(url){
  const original=new URL(url);
  if(original.protocol!=="https:"||original.hostname!=="images.squarespace-cdn.com"||!original.pathname.startsWith("/content/v1/"))
    throw Error("Image source is not the approved public Squarespace CDN");
  const sized=new URL(original.href);sized.searchParams.set("format","2500w");
  let lastError;
  for(const candidate of [sized,original]){
    try{
      const response=await fetch(candidate,{signal:AbortSignal.timeout(30000),headers:{
        "Accept":"image/avif,image/webp,image/png,image/jpeg,image/gif",
        "User-Agent":"EmpressVRContentMigration/1.0"
      }});
      if(!response.ok)throw Error("HTTP "+response.status);
      const mime=(response.headers.get("content-type")||"").split(";")[0].toLowerCase();
      if(!["image/png","image/jpeg","image/webp","image/avif","image/gif"].includes(mime))
        throw Error("Unsupported content type: "+mime);
      if(Number(response.headers.get("content-length")||0)>maxBytes)throw Error("Source exceeds 22 MiB");
      const input=Buffer.from(await response.arrayBuffer());
      if(input.length>maxBytes)throw Error("Source exceeds 22 MiB");
      const originalMeta=await sharp(input,{animated:true,limitInputPixels:120_000_000}).metadata();
      if(!originalMeta.width||!originalMeta.height)throw Error("Image lacks usable dimensions");
      const animated=originalMeta.pages&&originalMeta.pages>1;
      const gif=animated&&mime==="image/gif";
      const bytes=gif?input:await sharp(input,{limitInputPixels:120_000_000})
        .rotate().resize({width:2500,height:2500,fit:"inside",withoutEnlargement:true})
        .webp({quality:86,effort:4}).toBuffer();
      const meta=await sharp(bytes,{animated:true}).metadata();
      return {bytes,mime_type:gif?"image/gif":"image/webp",ext:gif?"gif":"webp",
        width:meta.width,height:meta.height};
    }catch(error){lastError=error;}
  }
  throw lastError||Error("Download failed");
}
const pending=data.media_assets.filter(m=>m.status!=="imported"||!m.storage_key||!existsSync("public/"+m.storage_key));
report.already_imported=data.media_assets.length-pending.length;
let next=0;
async function worker(){
  while(next<pending.length){
    const asset=pending[next++];report.attempted++;
    try{
      const image=await retrieve(asset.source_url);
      const digest=createHash("sha256").update(image.bytes).digest("hex");
      const storage_key=existing.get(digest)||"media/"+digest+"."+image.ext;
      const path=join("public",storage_key);
      mkdirSync(dirname(path),{recursive:true});
      if(!existsSync(path)){writeFileSync(path,image.bytes);report.bytes_written+=image.bytes.length;}
      existing.set(digest,storage_key);
      Object.assign(asset,{status:"imported",storage_key,mime_type:image.mime_type,width:image.width,
        height:image.height,sha256:digest,byte_size:image.bytes.length});
      report.imported++;
    }catch(error){
      asset.status="remote";
      report.failed.push({id:asset.id,url:asset.source_url,error:String(error).slice(0,250)});
    }
  }
}
await Promise.all(Array.from({length:4},worker));
mkdirSync("public/media",{recursive:true});
writeFileSync(indexPath,JSON.stringify(data,null,2)+"\n");
writeFileSync("docs/migration/media-import-report.json",JSON.stringify(report,null,2)+"\n");
console.log("Media import totals:",JSON.stringify({
  indexed:data.media_assets.length,attempted:report.attempted,imported:report.imported,
  already_imported:report.already_imported,failed:report.failed.length,bytes_written:report.bytes_written}));
if(report.failed.length)console.warn("Failed media remains remote until a retry. Read docs/migration/media-import-report.json.");
if(report.imported===0&&report.already_imported===0)process.exitCode=1;
