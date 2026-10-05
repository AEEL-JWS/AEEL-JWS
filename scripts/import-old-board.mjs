/**
 * One-time, repeatable migration from the former AEEL WordPress Board.
 *
 * Preview (read-only): node scripts/import-old-board.mjs
 * Import:              node scripts/import-old-board.mjs --apply
 *
 * The old Gallery is a flat Oxygen image grid, not a collection of posts.
 * Photos are grouped by their actual WordPress upload year. Album dates are
 * the latest media upload dates in each year, not inferred event dates.
 */
import {createHash} from 'node:crypto';
import {readdir, readFile, mkdir, writeFile, unlink} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join, dirname, extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const origin='https://shimgrp.korea.ac.kr';
const api=`${origin}/wp-json/wp/v2`;
const apply=process.argv.includes('--apply');
const galleryDir=join(root,'public/images/gallery');
const newsDir=join(root,'public/images/news');
const galleryContent=join(root,'src/content/gallery');
const newsContent=join(root,'src/content/news');
const knownNewsDuplicate=new Map([[2396,'2026-advanced-functional-materials-front-cover.md']]);
const knownGalleryDuplicate=new Set(['1782480031561-scaled.jpg']); // Existing Hallasan Lab Hiking photo.

function decodeHtml(value=''){
  const names={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',hellip:'…',ndash:'–',mdash:'—',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“'};
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(match,entity)=>{
    if(entity[0]==='#'){
      const hex=entity[1]?.toLowerCase()==='x';
      const number=Number.parseInt(entity.slice(hex?2:1),hex?16:10);
      return Number.isFinite(number)&&number>0&&number<=0x10ffff?String.fromCodePoint(number):match;
    }
    return names[entity.toLowerCase()]??match;
  });
}
function plain(html=''){
  return decodeHtml(html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')).trim();
}
function yaml(value){return JSON.stringify(value??'');}
function urlKey(value){
  try{return decodeURIComponent(new URL(value,origin).pathname).normalize('NFC').toLowerCase();}
  catch{return '';}
}
function uploadYear(value){return /\/uploads\/(\d{4})\//.exec(new URL(value).pathname)?.[1]??'';}
function originalUrl(media){
  if(!media?.source_url)return '';
  const original=media.media_details?.original_image;
  if(!original)return media.source_url;
  const url=new URL(media.source_url);
  url.pathname=url.pathname.replace(/[^/]+$/,encodeURIComponent(original));
  return url.toString();
}
function possiblePreScaledOriginal(url){
  const value=new URL(url);
  value.pathname=value.pathname.replace(/-scaled(?=\.[^.]+$)/i,'');
  return value.toString();
}
function safeExtension(value){
  const ext=extname(decodeURIComponent(new URL(value).pathname)).toLowerCase();
  return /^\.(jpe?g|png|webp|gif|avif)$/.test(ext)?ext:'.jpg';
}
function stableId(value){return createHash('sha256').update(value).digest('hex').slice(0,10);}
async function request(url,method='GET'){
  let last;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const response=await fetch(url,{method,headers:{'User-Agent':'AEEL-content-migration/1.0'},signal:AbortSignal.timeout(30000)});
      if(response.ok)return response;
      last=new Error(`${response.status} ${url}`);
      if(response.status<500)break;
    }catch(error){last=error;}
    await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));
  }
  throw last;
}
async function allRest(collection){
  const first=await request(`${api}/${collection}?per_page=100&page=1`);
  const pages=Number(first.headers.get('x-wp-totalpages')||1);
  const result=await first.json();
  for(let page=2;page<=pages;page++)result.push(...await (await request(`${api}/${collection}?per_page=100&page=${page}`)).json());
  return result;
}
async function mapLimit(items,limit,fn){
  const result=new Array(items.length);let next=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
    while(next<items.length){const index=next++;result[index]=await fn(items[index],index);}
  }));
  return result;
}
async function imageAccess(candidates){
  for(const url of [...new Set(candidates.filter(Boolean))]){
    try{
      const response=await request(url,'HEAD');
      return {url,bytes:Number(response.headers.get('content-length')||0)};
    }catch{/* Try the WordPress full-size image if the pre-scaling original is gone. */}
  }
  return null;
}
async function download(image){
  if(existsSync(image.path))return 'already present';
  const response=await request(image.url);
  const type=response.headers.get('content-type')||'';
  if(!type.startsWith('image/'))throw new Error(`Not an image: ${image.url} (${type})`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length<100)throw new Error(`Empty image: ${image.url}`);
  await mkdir(dirname(image.path),{recursive:true});
  await writeFile(image.path,bytes,{flag:'wx'});
  return `${bytes.length} bytes`;
}
function categoryFor(post){
  if(post.categories.includes(88))return 'Publication';
  if(post.categories.includes(87))return 'Media';
  const title=plain(post.title.rendered);
  if(title.includes('[수상]')||title.includes('표창 수상'))return 'Award';
  if(title.includes('기사 보도'))return 'Media';
  return 'Lab news';
}
function markdownFromOldHtml(html){
  return decodeHtml(html
    .replace(/<figure\b[\s\S]*?<\/figure>/gi,'\n\n')
    .replace(/<br\s*\/?\s*>/gi,'\n')
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi,(_,level,text)=>`\n\n${'#'.repeat(Number(level))} ${plain(text)}\n\n`)
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,(_,url,text)=>`[${plain(text)}](${decodeHtml(url)})`)
    .replace(/<\/(?:p|li)>/gi,'\n\n')
    .replace(/<[^>]+>/g,'')
    .replace(/[ \t]+/g,' ')
    .replace(/\n[ \t]+/g,'\n')
    .replace(/\n{3,}/g,'\n\n')).trim();
}
function anchors(html){
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)].map(match=>decodeHtml(match[1]));
}
function imagesIn(html){
  return [...html.matchAll(/<img\b[^>]*>/gi)].map(match=>({
    src:decodeHtml(/\bsrc=["']([^"']+)["']/i.exec(match[0])?.[1]||''),
    mediaId:Number(/\bwp-image-(\d+)/.exec(match[0])?.[1]||0)
  })).filter(image=>image.src);
}
async function main(){
  console.log(apply?'IMPORT MODE':'READ-ONLY PREVIEW');
  const [posts,media,html,galleryPage]=await Promise.all([
    allRest('posts'),allRest('media'),request(`${origin}/gallery/`).then(r=>r.text()),
    request(`${api}/pages?slug=gallery`).then(r=>r.json()).then(p=>p[0])
  ]);
  const mediaById=new Map(media.map(item=>[item.id,item]));
  const mediaByUrl=new Map(media.map(item=>[urlKey(item.source_url),item]));
  const mediaForUrl=url=>mediaByUrl.get(urlKey(url));
  const galleryMatches=[...html.matchAll(/<a\s+href='([^']+)'\s+class='oxy-gallery-item'>\s*<figure[^>]*>([\s\S]*?)<\/figure>\s*<\/a>/gi)];
  if(!galleryMatches.length)throw new Error('No gallery photos found; the old page structure may have changed.');
  const gallery=[];
  for(const match of galleryMatches){
    const shown=decodeHtml(match[1]);
    const mediaItem=mediaForUrl(shown);
    const candidates=mediaItem?[originalUrl(mediaItem),mediaItem.source_url,shown]:[possiblePreScaledOriginal(shown),shown];
    const basename=decodeURIComponent(new URL(shown).pathname.split('/').at(-1));
    const duplicate=knownGalleryDuplicate.has(basename)&&existsSync(join(galleryContent,'hallasan-lab-hiking.md'));
    const year=uploadYear(shown);
    const caption=plain(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i.exec(match[2])?.[1]||'');
    const id=mediaItem?.id||stableId(shown);
    gallery.push({shown,mediaItem,candidates,duplicate,year,caption,
      date:mediaItem?.date?.slice(0,10)||'',
      file:`gallery-${year}-${id}${safeExtension(candidates[0])}`});
  }
  const uniqueGallery=new Map(gallery.map(item=>[urlKey(item.shown),item]));
  const incomingGallery=[...uniqueGallery.values()].filter(item=>!item.duplicate);
  const missingGalleryDates=incomingGallery.filter(item=>!item.date);
  // The old page still links to two uploads that are absent from the public
  // media API. Their upload-path year is known; no date is inferred for them.
  const groups=new Map();
  for(const item of incomingGallery){
    if(!groups.has(item.year))groups.set(item.year,[]);
    groups.get(item.year).push(item);
  }

  const existingNews=await Promise.all((await readdir(newsContent)).filter(name=>name.endsWith('.md')).map(name=>readFile(join(newsContent,name),'utf8')));
  const normalized=value=>value.normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,'').toLowerCase();
  const seenNews=new Set(existingNews.map(text=>normalized(/^title:\s*(.*)$/m.exec(text)?.[1]?.replace(/^['"]|['"]$/g,'')||'')));
  const incomingNews=[];
  const skippedNews=[];
  for(const post of posts){
    const title=plain(post.title.rendered);
    const existing=knownNewsDuplicate.get(post.id);
    const file=`legacy-news-${post.id}.md`;
    const duplicate=(existing&&existsSync(join(newsContent,existing)))||existsSync(join(newsContent,file))||seenNews.has(normalized(title));
    if(duplicate){skippedNews.push({id:post.id,title,reason:existing?'Existing AFM cover story':'Already present'});continue;}
    const featured=mediaById.get(post.featured_media);
    const featuredUrl=featured?.source_url||'';
    const embedded=imagesIn(post.content.rendered);
    const extra=embedded.find(image=>image.mediaId&&image.mediaId!==post.featured_media&&urlKey(image.src)!==urlKey(featuredUrl));
    const extraMedia=extra?(mediaById.get(extra.mediaId)||mediaForUrl(extra.src)):null;
    const links=anchors(post.content.rendered).filter(url=>/^https?:/i.test(url)&&!url.includes('/wp-content/uploads/'));
    const excerpt=plain(post.excerpt.rendered);
    const bodyText=markdownFromOldHtml(post.content.rendered);
    const summary=excerpt||bodyText.replace(/^#+\s*/,'').split('\n')[0]?.trim()||title;
    incomingNews.push({post,title,file,date:post.date.slice(0,10),category:categoryFor(post),summary,bodyText,
      featured,featuredUrl,extra,extraMedia,external:links[0]||'',
      imageFile:featured?`news-wp-${post.id}${safeExtension(originalUrl(featured))}`:'',
      extraFile:extra?`news-wp-${post.id}-body${safeExtension(originalUrl(extraMedia)||extra.src)}`:''});
  }
  const images=[...incomingGallery.map(item=>({kind:'gallery',item,candidates:item.candidates,path:join(galleryDir,item.file)}))];
  for(const item of incomingNews){
    if(item.featured)images.push({kind:'news',item,candidates:[originalUrl(item.featured),item.featuredUrl],path:join(newsDir,item.imageFile)});
    if(item.extra)images.push({kind:'news-body',item,candidates:[originalUrl(item.extraMedia),item.extraMedia?.source_url,item.extra.src],path:join(newsDir,item.extraFile)});
  }
  await mapLimit(images,8,async image=>{
    image.access=await imageAccess(image.candidates);
    if(!image.access)throw new Error(`Original image unavailable: ${image.candidates[0]}`);
  });
  console.log(`Old Gallery: ${galleryMatches.length} image links, ${uniqueGallery.size} unique; no album posts or per-photo event dates.`);
  console.log(`Gallery plan: ${groups.size} upload-year albums, ${incomingGallery.length} photos; ${gallery.length-incomingGallery.length} already on new site.`);
  console.log(`Already imported: ${[...groups.keys()].filter(year=>existsSync(join(galleryContent,`legacy-gallery-${year}.md`))).length} albums and ${incomingGallery.filter(item=>existsSync(join(galleryDir,item.file))).length} Gallery image files.`);
  console.log(`Old Gallery page last modified: ${galleryPage.modified.slice(0,10)} (not used as event date).`);
  if(missingGalleryDates.length)console.log(`Gallery media without API dates: ${missingGalleryDates.length}; grouped only by upload-path year: ${missingGalleryDates.map(item=>item.shown).join(' | ')}`);
  for(const [year,items] of [...groups].sort((a,b)=>b[0].localeCompare(a[0]))){
    const date=items.map(item=>item.date).sort().at(-1);
    console.log(`  ${year} | ${date} (latest available media upload) | ${items.length} photos | cover: ${items[0].file}`);
  }
  console.log(`Old News: ${posts.length} posts across WordPress API pagination; ${incomingNews.length} to import, ${skippedNews.length} duplicates.`);
  for(const item of incomingNews){
    const dims=item.featured?.media_details;
    console.log(`  ${item.date} | ${item.title} | ${item.category} | ${dims?`${dims.width}x${dims.height}`:'no image'} | ${item.external||'no external article link'}${item.bodyText?'':' | no original body'}`);
  }
  for(const item of skippedNews)console.log(`  SKIP wp:${item.id} ${item.title} (${item.reason})`);
  const unscaled=images.filter(image=>image.item.mediaItem?.media_details?.original_image||image.item.featured?.media_details?.original_image||image.item.extraMedia?.media_details?.original_image);
  const fallback=images.filter(image=>image.access?.url!==image.candidates[0]);
  const bytes=images.reduce((sum,image)=>sum+(image.access?.bytes||0),0);
  console.log(`Images: ${images.length} originals selected; ${unscaled.length} have WordPress pre-scaling originals; estimated ${(bytes/1024/1024).toFixed(1)} MiB.`);
  console.log(`Higher-resolution original unavailable, using WordPress full-size image: ${fallback.length}.`);
  console.log(`Captions preserved: ${incomingGallery.filter(item=>item.caption).length}; photos without captions remain blank.`);
  if(!apply){console.log('No files written. Run with --apply to download and create CMS entries.');return;}

  await mapLimit(images,4,async(image,index)=>{
    const result=await download({url:image.access.url,path:image.path});
    console.log(`  image ${index+1}/${images.length}: ${image.path.split(/[\\/]/).at(-1)} (${result})`);
  });
  // Some WordPress records point to separate media IDs with byte-identical
  // files. Keep the featured image once, without adding a repeated body image.
  for(const item of incomingNews.filter(item=>item.extra&&item.imageFile)){
    const cover=join(newsDir,item.imageFile);
    const extra=join(newsDir,item.extraFile);
    const [coverHash,extraHash]=await Promise.all([readFile(cover),readFile(extra)]).then(buffers=>buffers.map(buffer=>createHash('sha256').update(buffer).digest('hex')));
    if(coverHash===extraHash){await unlink(extra);item.extra=null;console.log(`  duplicate body image removed: ${item.extraFile}`);}
  }
  await mkdir(galleryContent,{recursive:true});
  for(const [year,items] of groups){
    const path=join(galleryContent,`legacy-gallery-${year}.md`);
    if(existsSync(path)){console.log(`  album exists: ${path}`);continue;}
    const date=items.map(item=>item.date).sort().at(-1);
    const text=['---',`title: ${yaml(`AEEL Gallery Archive (${year} uploads)`)}`,`date: ${date}`,
      `description: ${yaml('Photos from the former AEEL Gallery, grouped by WordPress upload year. The album date is the latest available media upload date, not an event date.')}`,
      `cover: /images/gallery/${items[0].file}`,'photos:',
      ...items.flatMap(item=>[`  - image: /images/gallery/${item.file}`,...(item.caption?[`    caption: ${yaml(item.caption)}`]:[])]),
      '---',''].join('\n');
    await writeFile(path,text,{flag:'wx'});
    console.log(`  album created: ${path}`);
  }
  await mkdir(newsContent,{recursive:true});
  for(const item of incomingNews){
    const path=join(newsContent,item.file);
    if(existsSync(path)){console.log(`  news exists: ${path}`);continue;}
    const aspect=item.featured?.media_details;
    const imageFit=aspect&&aspect.width/aspect.height<0.95?'contain':'cover';
    const body=[item.bodyText];
    // Raw HTML keeps the relative URL for the generated page route. Astro's
    // Markdown asset pipeline would otherwise resolve a Markdown image
    // against src/content/news/ instead of the public/ directory.
    if(item.extra)body.push(`<img src="../../../images/news/${item.extraFile}" alt="Original article image" />`);
    body.push(`Original AEEL post: [${item.title}](${item.post.link})`);
    const text=['---',`title: ${yaml(item.title)}`,`date: ${item.date}`,`category: ${yaml(item.category)}`,
      `summary: ${yaml(item.summary)}`,...(item.imageFile?[`image: /images/news/${item.imageFile}`,`imageFit: ${imageFit}`]:[]),
      ...(item.external?[`link: ${yaml(item.external)}`]:[]),'---','',body.filter(Boolean).join('\n\n'),''].join('\n');
    await writeFile(path,text,{flag:'wx'});
    console.log(`  news created: ${path}`);
  }
  console.log('Import complete. Re-run without --apply for a duplicate-only preview.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
