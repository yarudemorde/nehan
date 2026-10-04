// Real useMemory() and save/load: cumulative wear, no probabilistic failure.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('index.html','utf8').split('<script>')[1].split('</script>')[0].split('state.screen="home";\nrender();')[0].replace('(() => {','');
const storage=new Map(),context=vm.createContext({console,crypto:require('node:crypto').webcrypto,document:{querySelector:()=>({})},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout,clearTimeout});
vm.runInContext(code,context);
vm.runInContext(`render=()=>{};scheduleCombatResolution=()=>{};
function fixture(){Math.random=()=>.5;state=freshState();const c=createCharacter({name:"摩耗試験",jobId:"JOB_BOUNTY_HUNTER",weaponId:"W001",memoryIds:["M001","M002","M003","M004"]});state.slots[0]=c;state.activeSlot=0;state.screen="run";state.run=newRun(c);state.run.ownerId=c.id;state.run.phase="combat";state.run.combat={enemy:{...ENEMIES[0],hp:100000,maxHp:100000,guard:0},log:[]};return c;}
let c=fixture();`,context);
const run=src=>JSON.parse(vm.runInContext(`JSON.stringify(${src})`,context));
const exec=src=>vm.runInContext(src,context);
assert.equal(run('ALPHA.breakIncreaseMax'),3);
// An RNG roll of zero used to fail any nonzero rate. It now hits and adds zero wear.
exec('c.memories[0].breakageRate=99.99;Math.random=()=>0;useMemory(c,0);');
assert(!run('c.memories[0].broken'));assert.equal(run('c.memories[0].breakageRate'),99.99);assert(run('state.run.combat.enemy.hp<100000'));assert(run('state.run.combat.pendingAction.endsTurn'));
// The threshold-crossing use resolves; subsequent uses cannot execute or advance wear.
exec('c=fixture();c.memories[1].breakageRate=99.9;Math.random=()=>.5;useMemory(c,1);');
assert.equal(run('c.memories[1].breakageRate'),100);assert(run('c.memories[1].broken'));assert(run('state.run.combat.enemy.hp<100000'));assert(!run('state.run.combat.pendingAction.endsTurn'));
exec('delete state.run.combat.pendingAction;c.memories[1].currentCT=0;const brokenSnapshot=JSON.stringify({c,combat:state.run.combat});useMemory(c,1);');assert(run('JSON.stringify({c,combat:state.run.combat})===brokenSnapshot'));
exec('save();state=load();c=state.slots[0];');assert.equal(run('c.memories[1].breakageRate'),100);assert(run('c.memories[1].broken'));
// Reaching the exact endpoint with the maximum increase: heal then break, no lost effect.
exec('c=fixture();c.hp=1;c.memories[2].breakageRate=97;Math.random=()=>1;useMemory(c,2);');
assert(run('c.hp>1'));assert.equal(run('c.memories[2].breakageRate'),100);assert(run('c.memories[2].broken'));assert(run('state.run.combat.pendingAction.endsTurn'));
exec('c=fixture();c.memories[3].breakageRate=98.5;Math.random=()=>.5;useMemory(c,3);');assert(run('state.run.shield>0'));assert(run('c.memories[3].broken'));assert(!run('state.run.combat.pendingAction.endsTurn'));
// A miss still incurs wear. Partial wear never causes a break on its own.
exec('c=fixture();Math.random=()=>.99;useMemory(c,0);');assert.equal(run('state.run.combat.enemy.hp'),100000);assert.equal(run('c.memories[0].breakageRate'),2.97);assert(!run('c.memories[0].broken'));
// Blocked actions have no effect, wear, or RNG draw.
for(const guard of ['c.memories[0].currentCT=1','c.memories[0].broken=true','state.run.combat.pendingAction={stage:"player",endsTurn:true}','state.run.phase="map"']){
 exec(`c=fixture();${guard};Math.random=()=>{throw Error("blocked action drew RNG")};var guarded=JSON.stringify(state);useMemory(c,0);`);assert(run('JSON.stringify(state)===guarded'));
}
// RNG variance stays in 0..3, including zero; only reaching 100 marks the item broken.
exec(`let sum=0,min=3,max=0;for(let i=0;i<=1000;i++){c=fixture();const fraction=i/1000;Math.random=()=>fraction;useMemory(c,3);const m=c.memories[3];if(m.breakageRate<0||m.breakageRate>3||m.broken)throw Error("wear range");sum+=m.breakageRate;min=Math.min(min,m.breakageRate);max=Math.max(max,m.breakageRate);}`);
assert.equal(run('min'),0);assert.equal(run('max'),3);assert(Math.abs(run('sum/1001')-1.5)<.01);
// Floating point cannot display 100% while leaving the instance usable.
exec('c=fixture();c.memories[3].breakageRate=99.7;Math.random=()=>.1;useMemory(c,3);');assert.equal(run('c.memories[3].breakageRate'),100);assert(run('c.memories[3].broken'));
// Migration includes equipped, Storage, pending battle loot and pending scrap loot.
exec(`c=fixture();c.memories[0].breakageRate=100;c.memories[0].broken=false;c.memories[1].breakageRate=7.5;c.memories[1].broken=true;c.inventory.memories=[{definitionId:"M001",breakageRate:120,broken:false,modules:[]}];state.run.loot={type:"MEMORY",item:{definitionId:"M003",breakageRate:100,modules:[]}};state.run.scrapLoot={type:"MEMORY",item:{definitionId:"M004",breakageRate:100,modules:[]}};save();state=load();c=state.slots[0];`);
assert(run('c.memories[0].broken'));assert(run('c.memories[1].broken'));assert.equal(run('c.memories[1].breakageRate'),7.5);assert.equal(run('c.inventory.memories[0].breakageRate'),100);assert(run('c.inventory.memories[0].broken&&state.run.loot.item.broken&&state.run.scrapLoot.item.broken'));
assert(run('memoryDescription(c,c.memories[0]).includes("使用後に破損率 +0.0〜3.0%。100%で使用不能。")'));
console.log('Wear 0..3, no random break, attack/miss/heal/shield, final effect before break, blocked actions, STANDARD/INSTANT, rounding, migration and reload PASS');
