// node tests/loot-modules.cjs — production logic, deterministic generation and save migration.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),code=html.split('<script>')[1].split('</script>')[0].split('state.screen="home";\nrender();')[0].replace('(() => {','');
const storage=new Map(),context=vm.createContext({console,crypto:require('node:crypto').webcrypto,document:{querySelector:()=>({})},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout,clearTimeout});
vm.runInContext(code,context);vm.runInContext(`render=()=>{};
const draft={name:"試験",jobId:"JOB_BOUNTY_HUNTER",weaponId:"W001",memoryIds:["M001","M002","M003","M004"]};
function fixture(){const c=createCharacter(draft);state.slots[0]=c;state.activeSlot=0;state.run=newRun(c);state.run.ownerId=c.id;return c;}
function fixed(effects,id="MOD001"){return {instanceId:itemId(),definitionId:id,rarity:"COMMON",generatedDepth:12,effectCount:effects.length,effects};}
function lcg(seed){return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
const c=fixture();`,context);
const run=src=>JSON.parse(vm.runInContext(`JSON.stringify(${src})`,context));
assert.deepEqual(run('Object.values(RARITY_SLOTS)'),[1,2,3,4,5]);
assert.equal(run('c.weapon.moduleSlots'),1);assert.deepEqual(run('c.memories.map(m=>m.moduleSlots)'),[1,1,2,2]);
assert.equal(new Set(run('[c.weapon,...c.memories].map(i=>i.instanceId)')).size,5);
// Every rarity retains its slot cap; negative corrections respect all floors.
vm.runInContext(`for(const [rarity,slots] of Object.entries(RARITY_SLOTS)){const limited=fixture();limited.weapon.rarity=rarity;normalizeItem(limited.weapon);for(let slot=0;slot<slots;slot++){const m=fixed([{target:"VIT",mode:"flat",value:1}]);limited.inventory.modules.push(m);if(!installModule(limited,m.instanceId,limited.weapon.instanceId,slot))throw Error("valid slot");}const extra=fixed([{target:"STR",mode:"flat",value:1}]);limited.inventory.modules.push(extra);if(installModule(limited,extra.instanceId,limited.weapon.instanceId,slots))throw Error("capacity exceeded");}
if(applyModuleModifiers(42,"MAX_HP",[fixed([{target:"MAX_HP",mode:"flat",value:-100}])],1)!==1)throw Error("HP floor");
if(applyModuleModifiers(9,"BASE_POWER",[fixed([{target:"BASE_POWER",mode:"percent",value:-200}])])!==0)throw Error("power floor");
if(applyModuleModifiers(8,"STR",[fixed([{target:"STR",mode:"flat",value:-20}])])!==0)throw Error("stat floor");state.slots[0]=c;state.run=newRun(c);state.run.ownerId=c.id;`,context);
const drops=run(`(()=>{const rng=lcg(123456),counts={MEMORY:0,MODULE:0};for(let i=0;i<100000;i++){const enemy=ENEMIES[i%3],l=generateLoot(enemy,rng,12);counts[l.type]++;if(l.type==="MEMORY"&&!enemy.memoryPool.includes(l.item.definitionId))throw Error("pool");if(l.type==="MODULE"&&(l.item.generatedDepth!==12||l.item.effects.length<1||l.item.effects.length>4))throw Error("instance");}return counts;})()`);
assert(Math.abs(drops.MEMORY/100000-.2)<.005);console.log('100000 drops',drops);
const depthMetrics=run(`(()=>{return [1,7,15,25,30,60,10000].map(depth=>{const rng=lcg(9182);let count=0,total=0,positive=0,min=Infinity,max=-Infinity;for(let i=0;i<10000;i++){const m=createModuleInstance(MODULES[i%2].id,depth,rng);if(m.effects.length<1||m.effects.length>4||new Set(m.effects.map(e=>e.target)).size!==m.effects.length)throw Error("count/duplicate");count+=m.effects.length;for(const e of m.effects){total+=Math.abs(e.value);if(e.value>0)positive+=e.value;min=Math.min(min,Math.abs(e.value));max=Math.max(max,Math.abs(e.value));}}return {depth,avgCount:count/10000,avgMagnitude:total/count,avgPositive:positive/10000,min,max};});})()`);
assert(depthMetrics[4].avgCount>depthMetrics[0].avgCount+1.5);assert(depthMetrics[4].avgMagnitude>depthMetrics[0].avgMagnitude*1.5);assert(depthMetrics[4].avgPositive>depthMetrics[0].avgPositive*2);assert.equal(run('modulePowerScale(60)'),run('modulePowerScale(10000)'));console.log('Depth generation metrics',depthMetrics);
const coverage=run(`(()=>{const rng=lcg(789),set=new Set();for(let i=0;i<12000;i++){for(const e of createModuleInstance(MODULES[i%2].id,30,rng).effects)set.add(e.target+":"+e.mode+":"+(e.value<0?"-":"+"));}return [...set];})()`);
for(const target of ['VIT','STR','DEX','INT','MAX_HP','BASE_POWER'])for(const mode of ['flat','percent'])for(const sign of ['+','-'])assert(coverage.includes(`${target}:${mode}:${sign}`));
// Character modifiers aggregate equipped modules; the base data never changes.
vm.runInContext(`c.stats={VIT:10,STR:20,DEX:20,INT:10};c.hp=35;c.weapon.rarity="LEGENDARY";normalizeItem(c.weapon);
c.weapon.modules=[fixed([{target:"VIT",mode:"flat",value:2},{target:"STR",mode:"flat",value:5},{target:"DEX",mode:"flat",value:-5},{target:"INT",mode:"flat",value:4}]),fixed([{target:"VIT",mode:"percent",value:20},{target:"STR",mode:"percent",value:20},{target:"DEX",mode:"percent",value:-20},{target:"INT",mode:"percent",value:50}]),fixed([{target:"MAX_HP",mode:"flat",value:8},{target:"MAX_HP",mode:"percent",value:20}])];normalizeItem(c.weapon);
const baseSnapshot=JSON.stringify({stats:c.stats,maxHp:c.maxHp,weaponPower:c.weapon.basePower});`,context);
assert.deepEqual(run('getEffectiveStats(c)'),{VIT:14,STR:30,DEX:12,INT:21});assert.equal(run('getEffectiveMaxHp(c)'),60);assert.equal(run('c.hp'),35);assert.equal(run('c.maxHp'),42);
vm.runInContext(`const storageMemory=createMemoryInstance("M001");storageMemory.modules=[fixed([{target:"STR",mode:"flat",value:100},{target:"MAX_HP",mode:"flat",value:100},{target:"BASE_POWER",mode:"flat",value:50}])];normalizeItem(storageMemory);c.inventory.memories=[storageMemory];`,context);
assert.equal(run('getEffectiveStats(c).STR'),30);assert.equal(run('getEffectiveMaxHp(c)'),60);
// Base Power only affects its own item, and the unchanged damage scaling uses it.
vm.runInContext(`c.weapon.modules.push(fixed([{target:"BASE_POWER",mode:"flat",value:1},{target:"BASE_POWER",mode:"percent",value:20}]));c.memories[0].modules=[fixed([{target:"BASE_POWER",mode:"percent",value:25}])];normalizeItem(c.weapon);normalizeItem(c.memories[0]);`,context);
assert.equal(run('getEffectiveBasePower(c.weapon)'),12);assert.equal(run('getEffectiveBasePower(c.memories[0])'),20);assert.equal(run('getEffectiveBasePower(c.memories[1])'),7);assert.equal(run('weaponPower(c)'),run('calcScaled(12,30)'));assert.equal(run('c.weapon.basePower'),9);assert.equal(run('getMemDef(c.memories[0]).basePower'),16);
// Install in a specific non-leading slot; overwriting consumes the new instance and destroys the old.
vm.runInContext(`const newModule=fixed([{target:"STR",mode:"flat",value:1}]);c.inventory.modules=[newModule];`,context);
assert(run('installModule(c,newModule.instanceId,c.weapon.instanceId,4)'));assert(!run('installModule(c,newModule.instanceId,c.memories[1].instanceId,0)'));
assert.equal(run('moduleAtSlot(c.weapon,4).instanceId'),run('newModule.instanceId'));assert(!run('installModule(c,"missing",c.weapon.instanceId,5)'));
vm.runInContext(`const oldId=moduleAtSlot(c.weapon,2).instanceId;c.hp=59;const replacement=fixed([{target:"MAX_HP",mode:"flat",value:-10}]);c.inventory.modules=[replacement];`,context);
assert(!run('installModule(c,replacement.instanceId,c.weapon.instanceId,5)'));assert(!run('installModule(c,replacement.instanceId,c.weapon.instanceId,2)'));
assert(!run('overwriteModule(c,replacement.instanceId,c.weapon.instanceId,2,"stale-id")'));
assert(run('overwriteModule(c,replacement.instanceId,c.weapon.instanceId,2,oldId)'));assert.equal(run('getEffectiveMaxHp(c)'),32);assert.equal(run('c.hp'),32);assert.equal(run('c.inventory.modules.length'),0);
assert(!run('installTargets(c).some(item=>item.modules.some(m=>m.instanceId===oldId))'));assert(!run('c.inventory.modules.some(m=>m.instanceId===oldId)'));
vm.runInContext(`const maxIncrease=fixed([{target:"MAX_HP",mode:"flat",value:8},{target:"MAX_HP",mode:"percent",value:20}]);c.inventory.modules=[maxIncrease];`,context);
assert(run('overwriteModule(c,maxIncrease.instanceId,c.weapon.instanceId,2,replacement.instanceId)'));assert.equal(run('getEffectiveMaxHp(c)'),60);assert.equal(run('c.hp'),32);
assert(run('JSON.stringify({stats:c.stats,maxHp:c.maxHp,weaponPower:c.weapon.basePower})===baseSnapshot'));
vm.runInContext('save();const afterReload=load();',context);
assert.equal(run('afterReload.slots[0].weapon.modules.find(m=>m.slotIndex===2).instanceId'),run('maxIncrease.instanceId'));
assert.equal(run('getEffectiveMaxHp(afterReload.slots[0])'),60);assert.equal(run('afterReload.slots[0].hp'),32);
// Hole positions remain stable through install and migration; effects stay intact through Memory swap.
vm.runInContext(`const sparse=fixture();sparse.weapon.rarity="LEGENDARY";normalizeItem(sparse.weapon);const loose=fixed([{target:"STR",mode:"flat",value:5}]);sparse.inventory.modules=[loose];`,context);
assert(run('installModule(sparse,loose.instanceId,sparse.weapon.instanceId,3)'));assert(run('!moduleAtSlot(sparse.weapon,0)'));assert.equal(run('moduleAtSlot(sparse.weapon,3).instanceId'),run('loose.instanceId'));vm.runInContext('save();',context);assert.equal(run('load().slots[0].weapon.modules[0].slotIndex'),3);
vm.runInContext(`const outgoing=sparse.memories[0];const incoming=createMemoryInstance("M003");incoming.modules=[fixed([{target:"INT",mode:"flat",value:4},{target:"MAX_HP",mode:"flat",value:10}])];incoming.breakageRate=7.5;incoming.broken=true;normalizeItem(incoming);sparse.inventory.memories=[incoming];const beforeSwap=JSON.stringify(incoming);`,context);
assert.equal(run('getEffectiveStats(sparse).INT'),5);assert.equal(run('getEffectiveMaxHp(sparse)'),42);assert(run('swapMemory(sparse,0,incoming.instanceId)'));assert.equal(run('getEffectiveStats(sparse).INT'),9);assert.equal(run('getEffectiveMaxHp(sparse)'),52);assert.equal(run('sparse.hp'),42);assert(run('JSON.stringify(incoming)===beforeSwap&&sparse.inventory.memories[0]===outgoing'));assert(run('swapMemory(sparse,0,outgoing.instanceId)'));assert.equal(run('getEffectiveMaxHp(sparse)'),42);
vm.runInContext('state.run.phase="combat";sparse.inventory.modules=[fixed([{target:"VIT",mode:"flat",value:2}])];',context);
assert(!run('installModule(sparse,sparse.inventory.modules[0].instanceId,sparse.memories[1].instanceId,0)'));assert(!run('overwriteModule(sparse,sparse.inventory.modules[0].instanceId,sparse.weapon.instanceId,3,loose.instanceId)'));assert(!run('swapMemory(sparse,0,incoming.instanceId)'));
// Old effects are snapshotted, old packed modules assigned consecutive slots, unknown modules retained.
const old=run(`normalizeState({slots:[{id:"old",stats:{VIT:10,STR:20,DEX:20,INT:8},hp:29,maxHp:42,weapon:{id:"W001",basePower:9,hit:90,rarity:"RARE",modules:[{instanceId:"old-one",definitionId:"MOD001"},{instanceId:"old-two",definitionId:"MOD002"}]},memories:["M001","M002","M003","M004"].map(definitionId=>({definitionId,currentCT:1,breakageRate:2,broken:false,modules:[{id:"unknown-legacy"}]})),inventory:{memories:[],modules:[{instanceId:"old-unused",definitionId:"MOD001"}]}}],run:{phase:"loot",loot:{type:"MODULE",item:{instanceId:"old-loot",definitionId:"MOD002"}}}})`);
assert.equal(old.slots[0].weapon.modules[0].slotIndex,0);assert.equal(old.slots[0].weapon.modules[1].slotIndex,1);assert.deepEqual(old.slots[0].weapon.modules[0].effects,[{target:'STR',mode:'percent',value:10},{target:'DEX',mode:'flat',value:-5}]);assert.equal(old.slots[0].memories[0].modules[0].id,'unknown-legacy');assert.equal(old.slots[0].hp,29);assert.equal(old.slots[0].maxHp,42);assert.equal(old.slots[0].inventory.modules[0].effects.length,2);assert.equal(old.run.loot.item.effects.length,2);
// Real weapon/Memory actions use effective inputs; healing stops at effective MAX_HP.
vm.runInContext(`const fighter=fixture();fighter.stats={VIT:6,STR:20,DEX:20,INT:5};fighter.weapon.modules=[fixed([{target:"BASE_POWER",mode:"percent",value:20},{target:"MAX_HP",mode:"flat",value:8},{target:"MAX_HP",mode:"percent",value:20}])];fighter.memories[0].modules=[fixed([{target:"BASE_POWER",mode:"percent",value:25}])];normalizeItem(fighter.weapon);normalizeItem(fighter.memories[0]);state.run.phase="combat";state.run.combat={enemy:{...ENEMIES[0],hp:1000,maxHp:1000,guard:0},log:[]};finishPlayerAction=()=>save();Math.random=()=>0;fighter.hp=58;`,context);
assert.equal(run('getEffectiveMaxHp(fighter)'),60);vm.runInContext('useWeapon(fighter);',context);assert.equal(run('state.run.combat.enemy.hp'),1000-run('calcScaled(11,20)')); // round(9*1.2)=11
vm.runInContext('useMemory(fighter,0);',context);assert.equal(run('state.run.combat.enemy.hp'),1000-run('calcScaled(11,20)')-run('calcScaled(20,20)'));
vm.runInContext('useMemory(fighter,2);',context);assert.equal(run('fighter.hp'),60);assert.equal(run('fighter.maxHp'),42);
// The defeated depth, not the incremented next-map depth, is recorded; reload does not roll again.
vm.runInContext('state.run.depth=30;state.run.combat.enemy.hp=0;Math.random=()=>.5;',context);assert(run('checkVictory(fighter)'));assert(!run('checkVictory(fighter)'));assert.equal(run('state.run.phase'),'loot');assert.equal(run('state.run.depth'),30);assert.equal(run('state.run.loot.item.generatedDepth'),30);assert.equal(run('state.run.loot.item.effects.length'),4);
const loot=run('state.run.loot');vm.runInContext('state=load();',context);assert.deepEqual(run('state.run.loot'),loot);assert(run('collectLoot(state.slots[0])'));assert(!run('collectLoot(state.slots[0])'));assert.equal(run('state.run.phase'),'map');assert.equal(run('state.run.depth'),31);assert.deepEqual(run('state.slots[0].inventory.modules.at(-1)'),loot.item);
assert(!/function (removeModule|uninstallModule|extractModule)/.test(code));
assert.deepEqual(run('MEMORIES.map(m=>Object.hasOwn(m,"modules"))'),[false,false,false,false]);
console.log('Instance effects, stat/MAX_HP/own-item power, explicit slots/install/overwrite/destruction, HP clamp/no heal, Memory swap, migration, action calculations and loot reload PASS');
