const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('index.html','utf8'),code=source.split('<script>')[1].split('</script>')[0].split('state.screen="home";\nrender();')[0].replace('(() => {','');
const store=new Map(),ctx=vm.createContext({console,crypto:require('node:crypto').webcrypto,document:{querySelector:()=>({})},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},setTimeout:()=>0,clearTimeout:()=>{}});vm.runInContext(code,ctx);
const exec=s=>vm.runInContext(s,ctx),read=s=>JSON.parse(exec(`JSON.stringify(${s})`));
exec(`render=()=>{};state=freshState();function draft(){return newCreationDraft(0);}function death(){const c=createCharacter(draft());state.slots[0]=c;state.activeSlot=0;state.run=newRun(c);state.run.ownerId=c.id;state.run.phase='dead';c.hp=0;return c;}let c=death(),m=c.memories[0];`);
assert.equal(read('DEATH_MEMORY_RECOVERY_COUNT'),1);
exec(`let stored=createMemoryInstance('M007');c.inventory.memories.push(stored);`);
assert.equal(read('salvageCandidates(c).length'),5);assert(read('salvageCandidates(c).includes(stored)'));
assert(!read('completeMemorySalvage(c,[m.instanceId,stored.instanceId])'));
assert(!read('recoverMemoryFromDeadCharacter("other",m.instanceId)'));
exec(`m.breakageRate=63.48;m.currentCT=2;m.generatedDepth=18;m.rarity='RARE';m.moduleSlots=3;m.extra={value:'retain'};m.modules=[normalizeModule({definitionId:'MOD001',instanceId:'hp-preserved',slotIndex:1,effects:[{target:'MAX_HP',mode:'percent',value:20},{target:'BASE_POWER',mode:'flat',value:6}]})];let original=JSON.stringify({...m,currentCT:0});let id=m.instanceId;state.run.salvage={opened:true,selectedInstanceId:id};save();state=load();c=state.slots[0];m=c.memories[0];`);
assert.equal(read('state.run.salvage.selectedInstanceId'),read('id'));assert.equal(read('state.slots[0].hp'),0);
assert(read('memoryArchiveDetails(c,m).includes("SLOT 3")'));assert(read('memoryArchiveDetails(c,m).includes("EMPTY")'));assert(read('memoryArchiveDetails(c,m).includes("16 → 22")'));
// Failed storage writes must not destroy the body or move a Memory into limbo.
exec(`let realSave=save;save=()=>{throw Error('quota');};`);
assert(!read('recoverMemoryFromDeadCharacter(c.id,id)'));assert(read('state.slots[0]===c'));assert(read('c.memories[0]===m'));assert.equal(read('m.currentCT'),2);assert.equal(read('state.metaInventory.memories.length'),0);
exec('save=realSave;');assert(read('recoverMemoryFromDeadCharacter(c.id,id)'));assert(read('state.metaInventory.memories[0]===m'));assert.equal(read('JSON.stringify(m)'),read('original'));assert(!read('recoverMemoryFromDeadCharacter(c.id,id)'));assert(!read('completeMemorySalvage(c,id)'));
assert.equal(read('state.slots[0]'),null);assert.equal(read('state.run'),null);
exec(`let d=draft();setCreationMemory(d,0,'recovered:'+id);state.activeSlot=0;state.createDraft=d;state.screen='create';state.creationEditor={kind:'memory',draft:d,selectedSlot:2};save();state=load();d=state.createDraft;m=state.metaInventory.memories[0];`);
assert.equal(read('state.creationEditor.selectedSlot'),2);assert.equal(read('state.metaInventory.memories.length'),1);assert.equal(read('state.creationEditor.draft.recoveredMemoryIds[0]'),read('id'));
// Recovered and Standard selections collide by Definition, not source.
exec(`let duplicate={...d,memoryIds:[...d.memoryIds],recoveredMemoryIds:[...d.recoveredMemoryIds]};duplicate.memoryIds[1]='M001';`);assert(!read('validCreationDraft(duplicate)'));assert(!read('commitCharacterCreation(duplicate)'));assert.equal(read('state.metaInventory.memories.length'),1);
exec(`save=()=>{throw Error('quota');};`);assert(!read('commitCharacterCreation(d)'));assert(read('state.metaInventory.memories[0]===m'));assert.equal(read('state.slots[0]'),null);assert.equal(read('state.screen'),'create');
exec('save=realSave;');assert(read('commitCharacterCreation(d)'));assert(read('state.slots[0].memories[0]===m'));assert.equal(read('state.metaInventory.memories.length'),0);assert.equal(read('state.slots[0].hp'),50);assert.equal(read('state.slots[0].maxHp'),42);assert.equal(read('getEffectiveMaxHp(state.slots[0])'),50);assert(!read('commitCharacterCreation(d)'));
exec(`save();state=load();c=state.slots[0];m=c.memories[0];`);assert.equal(read('JSON.stringify(m)'),read('original'));assert.equal(read('state.metaInventory.memories.length'),0);
// A malformed legacy archive is normalized, not rerolled; valid slot capacity stays intact.
exec(`state=freshState();state.metaInventory.memories=[{instanceId:'legacy',definitionId:'M003',rarity:'RARE',moduleSlots:2,modules:[{instanceId:'old-module',definitionId:'MOD001'}],breakageRate:47.31,broken:false,currentCT:7,generatedDepth:9}];state=normalizeState(state);let legacy=state.metaInventory.memories[0];save();state=load();`);
assert.equal(read('state.metaInventory.memories[0].moduleSlots'),2);assert.equal(read('state.metaInventory.memories[0].breakageRate'),47.31);assert.equal(read('state.metaInventory.memories[0].currentCT'),0);assert.equal(read('state.metaInventory.memories[0].modules[0].slotIndex'),0);assert.equal(read('state.metaInventory.memories[0].modules[0].effects.length'),2);
exec(`d=draft();setCreationMemory(d,2,'recovered:legacy');c=createCharacter(d);state.slots[0]=c;state.activeSlot=0;save();state=load();`);
assert.equal(read('state.slots[0].memories[2].moduleSlots'),2);assert.equal(read('state.slots[0].memories[2].breakageRate'),47.31);
console.log('Salvage limit/guards/selection reload, exact ownership, save-failure rollback, CREATE atomicity, MAX_HP inheritance, details and legacy archive normalization PASS');
