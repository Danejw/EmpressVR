import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {join} from "node:path";
const db=JSON.parse(readFileSync("src/features/content/content-index.json","utf8"));
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
const value=v=>v===null||v===undefined?"NULL":typeof v==="number"||typeof v==="boolean"?String(v):quote(v);
const insert=(table,record,conflict="id",jsonColumns=[])=>{
  const fields=Object.keys(record);
  const columns=fields.map(f=>'"'+f+'"').join(",");
  const values=fields.map(f=>jsonColumns.includes(f)?value(JSON.stringify(record[f]))+"::jsonb":value(record[f])).join(",");
  const updates=fields.filter(f=>f!==conflict).map(f=>'"'+f+'"=excluded."'+f+'"').join(",");
  return "insert into public."+table+" ("+columns+") values ("+values+") on conflict ("+conflict+") do update set "+updates+";";
};
const lines=[
"-- Generated EmpressVR migration data. Review rights and historical content before applying.",
"-- Re-runnable upserts preserve stable IDs; this file never removes rows.",
"begin;"
];
// Local imported files are not yet hosted in Supabase Storage.
 // Preserve any already-uploaded rows as imported on repeat seed runs.
for(const m of db.media_assets) {
  const statement = insert("media_assets",{...m,status:"remote"});
  lines.push(statement.replace('"status"=excluded."status"',
    '"status"=case when public.media_assets.status = \'imported\' then \'imported\' else excluded."status" end'));
}
for(const page of db.pages){
  const source=readFileSync(page.body_source,"utf8");
  lines.push(insert("site_pages",{id:page.id,path:page.path,source_key:page.source_key,
    title:page.title,body_markdown:source,published:page.published}));
}
for(const p of db.projects)lines.push(insert("projects",p));
for(const t of db.team_members)lines.push(insert("team_members",{
  id:t.id,page_id:t.page_id,name:t.name,slug:t.slug,external_url:t.external_url,
  roles:t.roles,group_name:t.group,headshot_media_id:t.headshot_media_id,sort_order:t.sort_order
},"id",["roles"]));
for(const p of db.products)lines.push(insert("products",p));
for(const e of db.events)lines.push(insert("events",e));
for(const b of db.blog_posts)lines.push(insert("blog_posts",b));
for(const r of db.site_media)lines.push(insert("site_media",r,"slot"));
for(const table of ["page_media","project_media","product_media"])
  for(const r of db[table])lines.push(insert(table,r));
lines.push("commit;");
mkdirSync("supabase",{recursive:true});
writeFileSync("supabase/seed-content.sql",lines.join("\n")+"\n");
const uploads=db.media_assets.filter(m=>m.status==="imported").map(m=>{
  const local_path=join("public",m.storage_key);
  if(!existsSync(local_path))throw Error("Missing local media "+local_path);
  return {id:m.id,bucket:"site-media",key:m.storage_key,local_path,
    mime_type:m.mime_type,sha256:m.sha256};
});
writeFileSync("supabase/asset-upload-manifest.json",JSON.stringify(uploads,null,2)+"\n");
console.log("Prepared idempotent SQL seed and",uploads.length,"Storage upload records.");
