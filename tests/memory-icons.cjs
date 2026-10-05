const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('MEMORY_ICONS[d.id]'));
const hashes=new Set();
for(let n=1;n<=13;n++){
 const path=`assets/memories/m${String(n).padStart(3,'0')}.webp`,b=fs.readFileSync(path);
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
 assert(b.length>1000);hashes.add(crypto.createHash('sha256').update(b).digest('hex'));
}
assert.equal(hashes.size,13);
assert(fs.readFileSync('style.css','utf8').includes('img[src^="assets/memories/"]{image-rendering:pixelated;background:#000}'));
console.log('13 unique WebP icons, shared Memory resolver and crisp black-ground display PASS');
