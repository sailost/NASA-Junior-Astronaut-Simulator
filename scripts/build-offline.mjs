import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const files = [];
const allFiles = [];
const onDemand = [];
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const name = `${dir}/${e.name}`;
    if (e.isDirectory()) await walk(name);
    else if (e.name !== "sw.js") {
      const path = name.slice(5);
      allFiles.push(path);
      if (/\.mp4$/i.test(path)) onDemand.push(path);
      else files.push(path);
    }
  }
}
await walk("dist");
const hash = createHash("sha256");
for (const file of allFiles) hash.update(await readFile(`dist/${file}`));
const version = hash.digest("hex").slice(0, 12);
await writeFile(
  "dist/sw.js",
  `const PREFIX='aurora-'+btoa(self.registration.scope)+'-',CACHE=PREFIX+'${version}',FILES=${JSON.stringify(files.map((f) => "./" + f))};self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.match(event.request.mode==='navigate'?new URL('./index.html',self.registration.scope).href:event.request).then(cached=>cached||fetch(event.request)))});`,
);
console.log(`Offline: ${files.length} archivos locales en caché ${version}; ${onDemand.length} videos se cargan bajo demanda.`);
