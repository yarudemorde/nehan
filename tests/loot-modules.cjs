const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),code=html.split('<script>')[1].split('</script>')[0].split('state.screen="home";\nrender();')[0].replace('(() => {','');
const storage=new Map(),context=vm.createContext({console,crypto:require('node:crypto').webcrypto,document:{querySelector:()=>({})},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout,clearTimeout});
vm.runInContext(code,context);
vm.runInContext(`
render=()=>{};
const draft={name:"試験",jobId:"JOB_BOUNTY_HUNTER",weaponId:"W001",memoryIds:["M001","M002","M003","M004"]};
const testCharacter=createCharacter(draft);state.slots[0]=testCharacter;state.activeSlot=0;
state.run=newRun(testCharacter);state.run.ownerId=testCharacter.id;
`,context);
const run=src=>JSON.parse(vm.runInContext(`JSON.stringify(${src})`,context));
assert.equal(run('testCharacter.weapon.moduleSlots'),1);
assert.deepEqual(run('testCharacter.memories.map(m=>m.moduleSlots)'),[1,1,2,2]);
assert.equal(new Set(run('[testCharacter.weapon,...testCharacter.memories].map(m=>m.instanceId)')).size,5);
let counts=run(`(()=>{let seed=123456,counts={MEMORY:0,MODULE:0};const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);for(let i=0;i<100000;i++){const l=generateLoot(ENEMIES[i%3],rng);if(!l.item.instanceId)throw Error("no instance");if(l.type==="MEMORY"&&!ENEMIES[i%3].memoryPool.includes(l.item.definitionId))throw Error("wrong pool");counts[l.type]++;}return counts;})()`);
assert(Math.abs(counts.MEMORY/100000-.2)<.005);console.log('100000 drops:',counts);
vm.runInContext(`testCharacter.stats={VIT:6,STR:20,DEX:20,INT:5};testCharacter.weapon.rarity="RARE";normalizeItem(testCharacter.weapon);testCharacter.memories[0].rarity="RARE";normalizeItem(testCharacter.memories[0]);testCharacter.inventory.modules=[createModuleInstance("MOD001"),createModuleInstance("MOD002")];const firstModule=testCharacter.inventory.modules[0].instanceId;const secondModule=testCharacter.inventory.modules[1].instanceId;`,context);
assert(run('installModule(testCharacter,firstModule,testCharacter.weapon.instanceId)'));
assert(!run('installModule(testCharacter,firstModule,testCharacter.memories[0].instanceId)'));
assert(run('installModule(testCharacter,secondModule,testCharacter.memories[0].instanceId)'));
assert.deepEqual(run('getEffectiveStats(testCharacter)'),{VIT:6,STR:28,DEX:14,INT:5});
assert.deepEqual(run('testCharacter.stats'),{VIT:6,STR:20,DEX:20,INT:5});
assert.equal(run('weaponPower(testCharacter)'),run('calcScaled(9,28)'));
vm.runInContext(`const stored=createMemoryInstance("M003");testCharacter.inventory.memories.push(stored);testCharacter.inventory.modules.push(createModuleInstance("MOD001"));const storedModule=testCharacter.inventory.modules[0].instanceId;`,context);
assert(run('installModule(testCharacter,storedModule,stored.instanceId)'));
assert.deepEqual(run('getEffectiveStats(testCharacter)'),{VIT:6,STR:28,DEX:14,INT:5});
vm.runInContext('stored.modules.push(createModuleInstance("MOD002"));testCharacter.memories[1].modules.push(createModuleInstance("MOD002"));testCharacter.inventory.modules.push(createModuleInstance("MOD002"));',context);
assert(!run('installModule(testCharacter,testCharacter.inventory.modules[0].instanceId,stored.instanceId)'));
assert(!run('installModule(testCharacter,testCharacter.inventory.modules[0].instanceId,testCharacter.memories[1].instanceId)'));
assert.equal(run('testCharacter.inventory.modules.length'),1);
for(const type of ['MEMORY','MODULE']){
 vm.runInContext(`state.run.phase="combat";state.run.combat={enemy:{...ENEMIES[0],hp:0},log:[]};globalThis.generateLootOriginal=generateLoot;generateLoot=()=>({type:"${type}",item:${type==='MEMORY'?'createMemoryInstance("M002")':'createModuleInstance("MOD001")'}});`,context);
 assert(run('checkVictory(testCharacter)'));assert(!run('checkVictory(testCharacter)'));assert.equal(run('state.run.phase'),'loot');assert.equal(run('state.run.combat'),null);
 const before=run(`testCharacter.inventory.${type==='MEMORY'?'memories':'modules'}.length`),saved=run('load()');
 assert.equal(saved.run.loot.type,type);vm.runInContext('state=load();',context);
 assert(run('collectLoot(state.slots[0])'));assert(!run('collectLoot(state.slots[0])'));
 assert.equal(run(`state.slots[0].inventory.${type==='MEMORY'?'memories':'modules'}.length`),before+1);assert.equal(run('state.run.phase'),'map');vm.runInContext('generateLoot=generateLootOriginal;',context);
}
assert.equal(run('load().slots[0].weapon.modules.length'),1);assert.equal(run('load().slots[0].memories[0].modules.length'),1);
const legacy=run(`normalizeState({slots:[{id:"old",stats:{VIT:10,STR:8,DEX:8,INT:8},hp:29,maxHp:42,weapon:{id:"W001",basePower:9,hit:90},memories:["M001","M002","M003","M004"].map(definitionId=>({definitionId,currentCT:1,breakageRate:2,broken:false,modules:[{id:"legacy-module"}]}))}]})`);
assert.equal(legacy.slots[0].hp,29);assert.equal(legacy.slots[0].weapon.mainStat,'STR');assert.equal(legacy.slots[0].weapon.moduleSlots,1);assert.deepEqual(legacy.slots[0].inventory,{memories:[],modules:[]});assert.equal(legacy.slots[0].memories[0].modules[0].id,'legacy-module');
assert.deepEqual(run('MEMORIES.map(m=>Object.hasOwn(m,"modules"))'),[false,false,false,false]);
assert(!/function (removeModule|uninstallModule|replaceModule)/.test(code));
console.log('Instances, install/capacity/double-use, effective stats, storage exclusion, loot reload/idempotence and legacy compatibility PASS');

assert.deepEqual(run('Object.entries(RARITY_SLOTS).map(([rarity])=>normalizeItem({rarity,modules:[]}).moduleSlots)'),[1,2,3,4,5]);
vm.runInContext(`
const swapped=createCharacter(draft);swapped.stats={VIT:6,STR:20,DEX:20,INT:5};
swapped.weapon.modules=[createModuleInstance("MOD001")];swapped.memories[0].modules=[createModuleInstance("MOD002")];
const outgoing=swapped.memories[0],incoming=createMemoryInstance("M002");incoming.modules=[createModuleInstance("MOD001")];incoming.currentCT=3;incoming.breakageRate=7.5;incoming.broken=true;
swapped.inventory.memories=[incoming];state.slots[0]=swapped;state.run=newRun(swapped);state.run.ownerId=swapped.id;
const originalBase=JSON.stringify(swapped.stats),originalIncoming=JSON.stringify(incoming),originalOutgoing=JSON.stringify(outgoing);
`,context);
assert.deepEqual(run('getEffectiveStats(swapped)'),{VIT:6,STR:28,DEX:14,INT:5});
assert(run('swapMemory(swapped,0,incoming.instanceId)'));
assert(run('swapped.memories[0]===incoming&&swapped.inventory.memories[0]===outgoing'));
assert(run('JSON.stringify(incoming)===originalIncoming&&JSON.stringify(outgoing)===originalOutgoing'));
assert.deepEqual(run('getEffectiveStats(swapped)'),{VIT:6,STR:24,DEX:10,INT:5});
assert(run('JSON.stringify(swapped.stats)===originalBase'));
assert.equal(run('swapped.memories.length'),4);
assert(!run('swapMemory(swapped,4,outgoing.instanceId)'));
vm.runInContext('swapped.inventory.modules.push(createModuleInstance("MOD001"));state.run.phase="combat";',context);
assert(!run('installModule(swapped,swapped.inventory.modules[0].instanceId,swapped.memories[2].instanceId)'));
assert(!run('swapMemory(swapped,0,outgoing.instanceId)'));
assert.equal(run('swapped.inventory.modules.length'),1);
vm.runInContext('state.run.phase="map";save();state=load();',context);
assert.equal(run('state.slots[0].memories[0].instanceId'),run('incoming.instanceId'));
assert.equal(run('state.slots[0].inventory.memories[0].instanceId'),run('outgoing.instanceId'));
assert.deepEqual(run('getEffectiveStats(state.slots[0])'),{VIT:6,STR:24,DEX:10,INT:5});
console.log('1–5 rarity slots, complete Memory swap/effective stats/save, and combat mutation guards PASS');
for(const rarity of ['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY']){
 vm.runInContext(`const bounded${rarity}=createCharacter(draft);bounded${rarity}.weapon.rarity="${rarity}";normalizeItem(bounded${rarity}.weapon);state.slots[0]=bounded${rarity};state.run=newRun(bounded${rarity});state.run.ownerId=bounded${rarity}.id;`,context);
 const capacity=run(`bounded${rarity}.weapon.moduleSlots`);
 for(let i=0;i<capacity;i++){
  vm.runInContext(`bounded${rarity}.inventory.modules.push(createModuleInstance("MOD001"));`,context);
  assert(run(`installModule(bounded${rarity},bounded${rarity}.inventory.modules[0].instanceId,bounded${rarity}.weapon.instanceId)`));
 }
 vm.runInContext(`bounded${rarity}.inventory.modules.push(createModuleInstance("MOD001"));`,context);
 assert(!run(`installModule(bounded${rarity},bounded${rarity}.inventory.modules[0].instanceId,bounded${rarity}.weapon.instanceId)`));
 assert.equal(run(`bounded${rarity}.weapon.modules.length`),capacity);
}
console.log('All five rarities reject capacity overflow PASS');
