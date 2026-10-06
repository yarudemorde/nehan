const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
assert(!html.includes('assets/memories/'));
assert(!fs.existsSync('assets/memories/m001.webp'));
for(let n=1;n<=4;n++)assert(fs.existsSync(`assets/action-${n}.svg`));
assert(html.includes('function equipmentIcon(item)'));
assert(html.includes('equipment-summary-heading'));
assert(html.includes('${equipmentIcon(creationMemory(draft,i)||{definitionId:id})}'));
console.log('Generated artwork removed; shared placeholder icons in loot, storage, equipment exchange and creation slots PASS');
