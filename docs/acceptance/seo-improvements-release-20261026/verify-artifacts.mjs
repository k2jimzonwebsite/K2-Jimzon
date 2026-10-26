import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const rows = [];
for (const [target, origin] of [['storefront','https://www.k2jimzon.com'], ['admin','https://admin.k2jimzon.com']]) {
  const marker = await fetch(origin+'/k2-build-target.json');
  assert.equal(marker.status,200);
  const identity = await marker.json();
  assert.equal(identity.target,target);
  const html = await fetch(origin+'/');
  assert.equal(html.status,200);
  const body = await html.text();
  const entry = body.match(/<script[^>]+src="([^"]*\/assets\/index-[^"]+\.js)"/i)?.[1];
  assert(entry);
  const asset = await fetch(new URL(entry, origin));
  const bytes = Buffer.from(await asset.arrayBuffer());
  assert.equal(asset.status,200); assert(bytes.length>0);
  rows.push({target,origin,identity,entry,status:asset.status,bytes:bytes.length,sha256:sha(bytes)});
}
for (const path of ['wood-bg.webp','seo-media/10eff3b03c25f453e29d-256.webp','fonts/fraunces-normal-7234ed860a9c.woff2','fonts/brand.css']) {
  const response = await fetch('https://www.k2jimzon.com/'+path);
  assert.equal(response.status,200);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(sha(bytes),sha(fs.readFileSync('public/'+path)));
  rows.push({path,status:response.status,bytes:bytes.length,sha256:sha(bytes),matchesSource:true});
}
fs.writeFileSync('.tools/seo-improvements-release-20261026/live-artifacts.json',JSON.stringify({at:new Date().toISOString(),pass:true,rows},null,2)+'\n');
console.log('ARTIFACTS_OK: separate targets, nonempty entry bundles, four delivery assets match source bytes.');
