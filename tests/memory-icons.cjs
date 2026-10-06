const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const code=html.split('<script>')[1].split('</script>')[0].split('state.screen="home";\nrender();')[0].replace('(() => {','');
function element(){return {innerHTML:'',style:{},dataset:{},querySelector(){return element()},querySelectorAll(){return []},appendChild(){},focus(){},remove(){}}}
const app=element(),ctx=vm.createContext({console,crypto:require('node:crypto').webcrypto,document:{querySelector:()=>app,querySelectorAll:()=>[],createElement:element},localStorage:{getItem:()=>null,setItem(){}},setTimeout:()=>0,clearTimeout(){}});
vm.runInContext(code,ctx);
const run=s=>vm.runInContext(s,ctx);
run('state=freshState();var c=createCharacter(newCreationDraft(0));state.slots[0]=c;state.activeSlot=0;state.run=newRun(c);state.run.ownerId=c.id;');
for(const id of run('MEMORIES.map(m=>m.id)')){
 const item=run('createMemoryInstance('+JSON.stringify(id)+')');
 ctx.item=item;
 const path=run('memoryIcon(item)');
 assert(fs.existsSync(path),path);
 const summary=run('equipmentSummary(item)');
 assert.equal((summary.match(/<img /g)||[]).length,1);
 assert(summary.includes(path));
 assert(summary.includes(run('itemName(item)')));
}
assert(!html.includes('assets/memories/'));
assert(!fs.existsSync('assets/memories'));
run('state.run.loot={type:"MEMORY",item:c.memories[0]};renderLoot(c)');
assert(app.innerHTML.includes('class="equipment-icon"'));
run('state.run.scrapLoot=state.run.loot;renderExploration(c,"scrap")');
assert(app.innerHTML.includes('class="equipment-icon"'));
run('c.inventory.memories=[createMemoryInstance("M005")]');
assert(run('storageEquipmentList(c,"memories")').includes('class="equipment-icon"'));
assert.equal((run('equipmentList(c)').match(/class="equipment-icon"/g)||[]).length,5);
run('state.slots[0]=null;state.createDraft=newCreationDraft(0);renderCreate()');
assert.equal((app.innerHTML.match(/class="memory-thumbnail"/g)||[]).length,4);
console.log('All 13 memory placeholders exist; loot, scrap, storage, equipment and creation render icons; removed artwork has no references PASS');
