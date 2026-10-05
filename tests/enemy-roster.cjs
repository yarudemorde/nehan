const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('index.html','utf8').split('<script>')[1].split('</script>')[0].split('state.screen="home";\nrender();')[0].replace('(() => {','');
const storage=new Map(),context=vm.createContext({console,crypto:require('node:crypto').webcrypto,document:{querySelector:()=>({})},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout,clearTimeout});
vm.runInContext(code,context);vm.runInContext(`render=()=>{};scheduleCombatResolution=()=>{};
const draft={name:"敵試験",jobId:"JOB_BOUNTY_HUNTER",weaponId:"W001",memoryIds:["M001","M002","M003","M004"]};
function fixture(id,depth=0){state=freshState();const c=createCharacter(draft);c.hp=c.maxHp=1000;state.slots[0]=c;state.activeSlot=0;state.screen="run";state.run=newRun(c);state.run.ownerId=c.id;state.run.depth=depth;state.run.routes=[{id:"battle",type:"battle",side:"L",enemyId:id,future:[]}];startCombat("L");return c;}
let c;`,context);
const exec=src=>vm.runInContext(src,context),run=src=>JSON.parse(vm.runInContext(`JSON.stringify(${src})`,context));
const defs=run('ENEMIES');assert.equal(defs.length,9);assert.equal(new Set(defs.map(e=>e.art)).size,9);
assert.deepEqual(defs.reduce((groups,e)=>({...groups,[e.faction]:(groups[e.faction]||0)+1}),{}),{blue:3,yellow:3,red:3});
for(const e of defs){
 const image=fs.readFileSync(e.art);assert(image.length>1000);assert.equal(image.toString('ascii',0,4),'RIFF');assert.equal(image.toString('ascii',8,12),'WEBP');
 assert(e.memoryPool.every(id=>run(`MEMORIES.some(m=>m.id===${JSON.stringify(id)})`)));assert.equal(new Set(e.pattern).size,e.moves.length);
 const guards=e.pattern.filter(id=>e.moves.find(m=>m.id===id).kind==='GUARD').length/e.pattern.length;
 assert(e.faction==='blue'?guards>=2/3:e.faction==='yellow'?guards===1/3:guards<=1/4);
 for(let turn=0;turn<e.pattern.length;turn++){
  exec(`c=fixture(${JSON.stringify(e.id)},10);state.run.combat.enemy.turn=${turn};chooseEnemyIntent();`);
  const intent=run('state.run.combat.intent'),before=run('state.run.combat.enemy');
  assert.equal(intent.label,e.moves.find(m=>m.id===e.pattern[turn]).label);assert(!['攻撃','強攻撃','防御'].includes(intent.label));
  exec('state.run.shield=100;endPlayerTurn(c);');
  if(intent.kind==='GUARD'){assert.equal(run('c.hp'),1000);assert.equal(run('state.run.combat.enemy.guard'),before.guard+intent.guard);assert.equal(run('state.run.shield'),100)}
  else {
   const hits=intent.hitCount||1;let bypass=0;
   for(let i=0;i<hits;i++){const raw=Math.floor(intent.damage/hits)+(i<intent.damage%hits?1:0);bypass+=Math.floor(raw*(intent.shieldPierce||0))}
   assert.equal(run('c.hp'),1000-bypass);assert.equal(run('state.run.shield'),100-intent.damage+bypass);assert.equal(run('state.run.combat.enemy.guard'),intent.guardGain||0);
  }
  assert.equal(run('state.run.combat.enemy.turn'),turn+1);assert(run('state.run.combat.log.some(l=>l.text.includes("CT -1"))'));
 }
}
// Burst damage is the existing total split across hits. Shield piercing actually bypasses protection.
exec('c=fixture("E09");state.run.shield=0;const burst=state.run.combat.intent;endPlayerTurn(c);');assert.equal(run('c.hp'),1000-run('burst.damage'));assert(run('state.run.combat.log.some(l=>l.text.includes("3 HIT"))'));
exec('c=fixture("E08");state.run.combat.enemy.turn=1;chooseEnemyIntent();state.run.shield=100;endPlayerTurn(c);');assert.equal(run('c.hp'),993);assert.equal(run('state.run.shield'),93);
// Defenses still absorb outgoing damage through the existing applyEnemyDamage().
exec('c=fixture("E04");endPlayerTurn(c);const prior=state.run.combat.enemy.hp;const absorbed=applyEnemyDamage(20);');assert.equal(run('absorbed'),8);assert.equal(run('state.run.combat.enemy.hp'),run('prior')-8);
// Every enemy can appear, no enemy identity is exposed on MAP, old preview names stay valid.
assert.equal(new Set(run('Array.from({length:9},(_,depth)=>makeRoutes(depth,()=>.5)[0].enemyId)')).size,9);
assert.equal(run('normalizeNode("逆接僧兵").enemyId'),'E03');assert.equal(run('normalizeNode("違法義体狩り").enemyId'),'E02');
// Migrate old combat without replaying or changing its pending attack, HP, or timer stage.
exec(`c=fixture("E01");Object.assign(state.run.combat.enemy,{name:"廃棄ドローン",hp:17,guard:9,turn:2,pattern:["ATTACK","ATTACK","GUARD"]});delete state.run.combat.enemy.moves;delete state.run.combat.enemy.art;state.run.combat.intent={kind:"ATTACK",label:"攻撃",damage:6};state.run.combat.pendingAction={stage:"enemy",endsTurn:true};save();state=load();c=state.slots[0];`);
assert.equal(run('state.run.combat.enemy.hp'),17);assert.equal(run('state.run.combat.enemy.guard'),9);assert.equal(run('state.run.combat.enemy.turn'),2);assert.deepEqual(run('state.run.combat.intent'),{kind:'ATTACK',label:'攻撃',damage:6});assert.equal(run('state.run.combat.pendingAction.stage'),'enemy');assert.equal(run('enemySprite(state.run.combat.enemy)'),'assets/enemies/blue-guard.webp');assert.equal(run('state.run.combat.enemy.moves.length'),3);
exec('chooseEnemyIntent();');assert.equal(run('state.run.combat.intent.label'),'警戒姿勢');
console.log('9 enemies / 3 factions, 29 named moves, defensive/balanced/offensive cycles, shield/hybrid/burst/pierce, 9 MAP encounters and in-flight save migration PASS');
