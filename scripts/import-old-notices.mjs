/**
 * Import the bodies of the former AEEL WordPress notices into existing CMS
 * entries. Run without arguments to audit; run with --apply to save changes.
 * Existing nonempty CMS bodies are never overwritten.
 */
import {readdir, readFile, mkdir, writeFile} from 'node:fs/promises';
import {join, extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const noticesDir=join(root,'src/content/notices');
const imagesDir=join(root,'public/images/notices');
const apply=process.argv.includes('--apply');
const names=(await readdir(noticesDir)).filter(name=>name.endsWith('.md')).sort();

async function request(url){
  let lastError;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const response=await fetch(url,{headers:{'User-Agent':'AEEL-archive-migration/1.0'},signal:AbortSignal.timeout(30000)});
      if(response.ok)return response;
      lastError=new Error(`${response.status} ${url}`);
      if(response.status<500)break;
    }catch(error){lastError=error;}
    if(attempt<2)await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));
  }
  throw lastError;
}
async function mapLimit(items,limit,fn){
  const results=new Array(items.length);
  let next=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
    while(next<items.length){const index=next++;results[index]=await fn(items[index],index);}
  }));
  return results;
}
function articleBody(html){
  const start=/<div\b[^>]*\bid=['"]inner_content-158-266['"][^>]*>/i.exec(html);
  if(!start)throw new Error('WordPress notice body container not found');
  const offset=start.index+start[0].length;
  const tags=/<\/?div\b[^>]*>/gi;
  let depth=1;
  for(const match of html.slice(offset).matchAll(tags)){
    depth+=/^<\//.test(match[0])?-1:1;
    if(depth===0)return html.slice(offset,offset+match.index).trim()
      // One legacy notice has an unfinished image tag immediately before a
      // valid image. Keep the valid image rather than treating both as one.
      .replace(/<img\b[^>]*\bsrc=["']https:\/\/shimgrp\.korea\.ac\.kr\/><img\b/gi,'<img');
  }
  throw new Error('WordPress notice body container is not closed');
}
function hasMeaningfulContent(html){
  const text=html.replace(/<[^>]*>/g,' ')
    .replace(/&#(x[\da-f]+|\d+);/gi,(_,value)=>String.fromCodePoint(Number.parseInt(value.slice(value[0].toLowerCase()==='x'?1:0),value[0].toLowerCase()==='x'?16:10)))
    .replace(/&nbsp;/gi,' ').trim();
  return /<(?:img|iframe|a)\b/i.test(html)||/[\p{L}\p{N}]/u.test(text);
}
function existingBody(file){
  const end=/^---\s*\r?\n[\s\S]*?^---\s*\r?\n/m.exec(file);
  if(!end)throw new Error('Markdown frontmatter missing');
  return {frontmatter:end[0],body:file.slice(end[0].length).trim()};
}
function imageSources(html){
  return [...html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(match=>match[1]);
}
function localImageName(notice,index,source){
  const extension=extname(decodeURIComponent(new URL(source).pathname)).toLowerCase();
  if(!/^\.(?:jpg|jpeg|png|webp|gif)$/.test(extension))throw new Error(`Unsupported image: ${source}`);
  return `${notice.replace(/\.md$/,'')}-${String(index+1).padStart(2,'0')}${extension}`;
}
function linkifyBareUrls(html){
  return html.replace(/<p>([\s\S]*?)<\/p>/gi,(paragraph,inner)=>{
    if(/<(?:a|img|iframe)\b/i.test(inner))return paragraph;
    return `<p>${inner.replace(/https?:\/\/[^\s<()]+/gi,url=>`<a href="${url}">${url}</a>`)}</p>`;
  });
}
function localizeImages(html,notice){
  let index=0;
  return html.replace(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,(_,source)=>{
    const name=localImageName(notice,index++,source);
    return `<img src="../../../images/notices/${name}" alt="" loading="lazy">`;
  });
}

const current=await Promise.all(names.map(async name=>{
  const file=await readFile(join(noticesDir,name),'utf8');
  const url=/^sourceUrl: ["']([^"']+)["']/m.exec(file)?.[1];
  if(!url)throw new Error(`sourceUrl missing: ${name}`);
  return {name,file,url,...existingBody(file)};
}));

const results=await mapLimit(current,8,async item=>{
  const html=await (await request(item.url)).text();
  const body=articleBody(html);
  return {...item,originalBody:body,meaningful:hasMeaningfulContent(body)};
});
const populated=results.filter(item=>item.meaningful);
const skipped=populated.filter(item=>item.body);
const toImport=populated.filter(item=>!item.body);
const assets=toImport.flatMap(item=>imageSources(item.originalBody).map((source,index)=>({name:localImageName(item.name,index,source),source})));
console.log(`Checked ${results.length} original notices: ${populated.length} with content, ${results.length-populated.length} without content.`);
console.log(`${toImport.length} notice bodies and ${assets.length} images to import; ${skipped.length} existing bodies preserved.`);

if(apply){
  const downloads=await mapLimit(assets,5,async asset=>{
    const url=new URL(asset.source);
    if(url.hostname!=='shimgrp.korea.ac.kr'||!url.pathname.startsWith('/wp-content/uploads/'))throw new Error(`Unexpected image source: ${asset.source}`);
    const response=await request(asset.source);
    if(!response.headers.get('content-type')?.startsWith('image/'))throw new Error(`Image response was not an image: ${asset.source}`);
    return {name:asset.name,bytes:Buffer.from(await response.arrayBuffer())};
  });
  await mkdir(imagesDir,{recursive:true});
  for(const asset of downloads)await writeFile(join(imagesDir,asset.name),asset.bytes);
  for(const item of toImport){
    const body=linkifyBareUrls(localizeImages(item.originalBody,item.name))
      .replace(/<p>(?:\s|&nbsp;|&#160;)*<\/p>/gi,'')
      .trim();
    await writeFile(join(noticesDir,item.name),`${item.frontmatter.trimEnd()}\n\n${body}\n`);
  }
  console.log(`Saved ${toImport.length} notice bodies and ${downloads.length} images.`);
}
