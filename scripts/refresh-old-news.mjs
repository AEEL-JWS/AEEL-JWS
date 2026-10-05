/**
 * Refresh previously imported AEEL News stories from their WordPress post
 * bodies. Preview with no arguments, or use --apply to save. Stories edited
 * in Pages CMS after the first import are left alone.
 */
import {readdir, readFile, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join, extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const newsDir=join(root,'src/content/news');
const imagesDir=join(root,'public/images/news');
const apply=process.argv.includes('--apply');
const names=(await readdir(newsDir)).filter(name=>/^legacy-news-\d+\.md$/.test(name)).sort();

async function request(url){
  let error;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const response=await fetch(url,{headers:{'User-Agent':'AEEL-news-archive/1.0'},signal:AbortSignal.timeout(30000)});
      if(response.ok)return response;
      error=new Error(`${response.status} ${url}`);
      if(response.status<500)break;
    }catch(cause){error=cause;}
    if(attempt<2)await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));
  }
  throw error;
}
async function mapLimit(items,limit,fn){
  const result=new Array(items.length);
  let next=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
    while(next<items.length){const index=next++;result[index]=await fn(items[index],index);}
  }));
  return result;
}
function splitFrontmatter(file){
  const frontmatter=/^---\s*\r?\n[\s\S]*?^---\s*\r?\n/m.exec(file)?.[0];
  if(!frontmatter)throw new Error('Missing Markdown frontmatter');
  return {frontmatter,body:file.slice(frontmatter.length).trim()};
}
function postId(name){return Number(/legacy-news-(\d+)\.md/.exec(name)[1]);}
function imageTags(html){return [...html.matchAll(/<img\b[^>]*>/gi)].map(match=>match[0]);}
function attribute(tag,name){return new RegExp(`\\b${name}=["']([^"']*)["']`,'i').exec(tag)?.[1]||'';}
function imageSource(tag){
  const source=attribute(tag,'src');
  const url=new URL(source.replace('http://dk023.mycafe24.com','https://shimgrp.korea.ac.kr'));
  if(url.hostname!=='shimgrp.korea.ac.kr'||!url.pathname.startsWith('/wp-content/uploads/'))throw new Error(`Unexpected WordPress image: ${source}`);
  return url.toString();
}
function imageFilename(item,tag){
  const mediaId=Number(/wp-image-(\d+)/.exec(attribute(tag,'class'))?.[1]||0);
  if(!mediaId)throw new Error(`Image has no WordPress media ID: ${item.name}`);
  if(mediaId===item.post.featured_media)return item.featuredImage;
  const extension=extname(decodeURIComponent(new URL(imageSource(tag)).pathname)).toLowerCase();
  if(!/^\.(?:jpe?g|png|webp|gif)$/.test(extension))throw new Error(`Unexpected image extension: ${item.name}`);
  return `news-wp-${item.id}-body${extension}`;
}
function normalizeBody(item){
  const html=item.post.content.rendered.trim();
  return html.replace(/<img\b[^>]*>/gi,tag=>{
    const filename=imageFilename(item,tag);
    return `<img src="../../../images/news/${filename}" alt="" loading="lazy">`;
  }).replace(/<p>\s*<\/p>/gi,'').trim();
}

const entries=await Promise.all(names.map(async name=>{
  const id=postId(name);
  const file=await readFile(join(newsDir,name),'utf8');
  const {frontmatter,body}=splitFrontmatter(file);
  const featuredImage=/^image: (.+)$/m.exec(frontmatter)?.[1]?.trim().replace(/^['"]|['"]$/g,'').split('/').pop();
  if(!featuredImage)throw new Error(`Missing featured image: ${name}`);
  return {name,id,frontmatter,body,featuredImage,eligible:/^Original AEEL post:/m.test(body)};
}));
const oldPosts=await mapLimit(entries,6,async item=>{
  const post=await (await request(`https://shimgrp.korea.ac.kr/wp-json/wp/v2/posts/${item.id}?_fields=id,title,content,featured_media,link`)).json();
  if(post.id!==item.id||typeof post.content?.rendered!=='string')throw new Error(`Invalid WordPress post ${item.id}`);
  return {...item,post};
});
const toRefresh=oldPosts.filter(item=>item.eligible);
const images=toRefresh.flatMap(item=>imageTags(item.post.content.rendered).map(tag=>({
  filename:imageFilename(item,tag),source:imageSource(tag)
}))).filter(image=>!existsSync(join(imagesDir,image.filename)));
const uniqueImages=[...new Map(images.map(image=>[image.filename,image])).values()];
console.log(`Checked ${oldPosts.length} original News posts: ${toRefresh.length} ready to refresh, ${oldPosts.length-toRefresh.length} already edited.`);
console.log(`${toRefresh.filter(item=>item.post.content.rendered.trim()).length} have original body content; ${uniqueImages.length} missing body images to download.`);

if(apply){
  const downloaded=await mapLimit(uniqueImages,4,async image=>{
    const response=await request(image.source);
    if(!response.headers.get('content-type')?.startsWith('image/'))throw new Error(`Not an image: ${image.source}`);
    return {...image,bytes:Buffer.from(await response.arrayBuffer())};
  });
  for(const image of downloaded)await writeFile(join(imagesDir,image.filename),image.bytes);
  for(const item of toRefresh){
    const body=normalizeBody(item);
    await writeFile(join(newsDir,item.name),body?`${item.frontmatter.trimEnd()}\n\n${body}\n`:`${item.frontmatter.trimEnd()}\n`);
  }
  console.log(`Updated ${toRefresh.length} News files and saved ${downloaded.length} images.`);
}
