import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function article(slug,status='published',body='A public paragraph.') {
 return `---\ntype: 博客文章\ntitle: ${slug}\ndescription: Source boundary fixture\nstatus: ${status}\nslug: ${slug}\ncreated: 2026-01-01\nmodified: 2026-01-01\ntags: [test, source]\n---\n${body}\n`;
}
test('Oasis publication directory, metadata and asset boundary',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'astro-oasis-'));
 const blog=path.join(temp,'Blog');
 function put(rel,body){const p=path.join(blog,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,body);return p;}
 function sync(dir=blog){return spawnSync(process.execPath,['scripts/sync-posts.mjs'],{cwd:project,encoding:'utf8',env:{...process.env,BLOG_SOURCE:'directory',BLOG_DIR:dir,SITE_URL:'https://example.com'}});}
 try {
  put('2026/live.md',article('stable-url'));
  put('2015/archive.md',article('historical-url','archived'));
  put('2026/not-released.md',article('not-released','draft'));
  put('草稿/private.md',article('private-draft'));
  put('index.md','---\ntype: 独立页面\ntitle: About fixture\n---\nAbout fixture.');
  put('2026/nested/private.md',article('private-nested'));
  put('已发布/2026/retired.md',article('private-retired'));
  put('自动草稿/private.md',article('private-auto'));
  put('来源归档/2026/original.md',article('private-source'));
  put('assets/发布产物/channel/original.md',article('private-delivery'));
  fs.mkdirSync(path.join(temp,'Diary/2026'),{recursive:true});
  fs.writeFileSync(path.join(temp,'Diary/2026/private.md'),article('private-diary'));
  let result=sync();assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/Synced 2 post\(s\)/);
  assert.match(fs.readFileSync(path.join(project,'.cache/content/about/index.md'),'utf8'),/About fixture/);
  put('2026/pending.md',article('unreviewed').replace('status: published','status: published\nreview_status: pending'));
  result=sync();assert.notEqual(result.status,0);assert.match(result.stderr,/awaits user review/);
  fs.unlinkSync(path.join(blog,'2026/pending.md'));
  result=sync();assert.equal(result.status,0,result.stderr);
  const files=fs.readdirSync(path.join(project,'.cache/content/posts'));
  assert.equal(files.length,2);assert.ok(files.some(p=>p.includes('stable-url')));assert.ok(files.some(p=>p.includes('historical-url')));
  result=sync(temp);assert.notEqual(result.status,0);assert.match(result.stderr,/refusing to scan/);
  fs.mkdirSync(path.join(temp,'Health/assets'),{recursive:true});
  fs.writeFileSync(path.join(temp,'Health/assets/private.txt'),'PRIVATE MEDICAL FIXTURE');
  put('2026/live.md',article('stable-url','published','[attachment](../../Health/assets/private.txt)'));
  result=sync();assert.notEqual(result.status,0);assert.match(result.stderr,/Public asset must stay inside Blog\/assets/);
  fs.mkdirSync(path.join(blog,'assets'),{recursive:true});fs.symlinkSync(path.join(temp,'Health/assets/private.txt'),path.join(blog,'assets/escape.txt'));
  put('2026/live.md',article('stable-url','published','[attachment](../assets/escape.txt)'));
  result=sync();assert.notEqual(result.status,0);assert.match(result.stderr,/Public asset must stay inside Blog\/assets/);
  put('assets/public.txt','PUBLIC ASSET');put('2026/live.md',article('stable-url','published','[attachment](../assets/public.txt)'));
  result=sync();assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/1 asset/);
 } finally {fs.rmSync(temp,{recursive:true,force:true});}
});
