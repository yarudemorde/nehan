const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
const base=process.env.BASE_URL||'http://localhost:8765';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-gpu','--no-zygote'],...(process.env.BASE_URL&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
const read=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('nehan_alpha_v1')));
async function open(p){await p.goto(base);await p.locator('#splash').click();await p.locator('#splash').waitFor({state:'detached'});await p.locator('[data-nav="play"]').click();await p.locator('[data-slot="0"]').click()}
for(const kind of ['MEMORY','MODULE']){
 const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,ignoreHTTPSErrors:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const c={id:'test-body',name:'試験',stats:{VIT:6,STR:20,DEX:20,INT:5},maxHp:42,hp:42,weapon:{id:'W001',name:'鉄管ブレード',basePower:9,hit:90,rarity:'RARE'},memories:['M001','M002','M003','M004'].map(definitionId=>({definitionId,currentCT:0,breakageRate:0,broken:false,modules:[],...(definitionId==='M001'?{rarity:'RARE'}:{})})),depth:0,wins:0,createdAt:1};
 const fixture={slots:[c,null,null],activeSlot:0,screen:'run',run:{ownerId:c.id,depth:0,phase:'combat',shield:0,combat:{enemy:{id:'E01',name:'廃棄ドローン',maxHp:30,hp:1,guard:0,atk:6,pattern:['ATTACK','ATTACK','GUARD'],turn:0},intent:{kind:'ATTACK',damage:6,label:'攻撃'},log:[]},routes:[],log:[]}};
 await p.addInitScript(({fixture,roll})=>{Math.random=()=>roll;if(!localStorage.getItem('nehan_alpha_v1'))localStorage.setItem('nehan_alpha_v1',JSON.stringify(fixture))},{fixture,roll:kind==='MEMORY'?.1:.25});await open(p);await p.locator('#weaponBtn').click();assert(await p.locator('.enemy-figure .damage-popup').isVisible());await p.locator('#collectLoot').waitFor();let s=await read(p);assert.equal(s.run.phase,'loot');assert.equal(s.run.loot.type,kind);assert.equal(s.slots[0].hp,42);assert.equal(await p.locator('.enemy-figure').count(),0);
 if(process.env.SCREENSHOT_DIR)await p.screenshot({path:`${process.env.SCREENSHOT_DIR}/loot-${kind}.png`});const lootSnapshot=s.run.loot.item;const lootId=lootSnapshot.instanceId;await p.reload();await p.locator('#splash').click();await p.locator('#splash').waitFor({state:'detached'});await p.locator('[data-nav="play"]').click();await p.locator('[data-slot="0"]').click();assert.deepEqual((await read(p)).run.loot.item,lootSnapshot);await p.locator('#collectLoot').click();s=await read(p);assert.equal(s.run.phase,'map');assert.equal(s.slots[0].inventory[kind==='MEMORY'?'memories':'modules'].length,1);
 await p.locator('#exitRun').click();await p.locator('[data-nav="inventory"]').click();await p.locator('[data-nav="inventory"]').click();assert(await p.locator('.inventory-list').isVisible());
 for(const [width,height] of [[320,568],[375,667],[390,844],[393,852],[430,932]]){
  await p.setViewportSize({width,height});await p.waitForFunction(()=>Math.abs(document.querySelector("#app").getBoundingClientRect().height-innerHeight)<1);
  const g=await p.evaluate(()=>{const home=document.querySelector('[data-nav="home"]').getBoundingClientRect();return {overflow:[document.documentElement.scrollWidth-innerWidth,document.documentElement.scrollHeight-innerHeight],bottom:home.bottom,targets:[...document.querySelectorAll('.inventory-tabs button,#inventoryCharacter')].map(e=>e.getBoundingClientRect().height)}});
  assert.deepEqual(g.overflow,[0,0]);assert(g.bottom<=height+1,JSON.stringify({width,height,...g}));assert(g.targets.every(h=>h>=44));
 }
 await p.setViewportSize({width:390,height:844});
 if(kind==='MEMORY'){await p.locator('[data-inventory-tab="memories"]').click();assert((await p.locator('.inventory-list').innerText()).includes('速断'));}
 else{
  // The sample includes a circuit on the weapon and muscle fibre on equipped M001.
  await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('nehan_alpha_v1'));s.slots[0].inventory.modules[0].effects=[{target:'STR',mode:'percent',value:10},{target:'DEX',mode:'flat',value:-5}];s.slots[0].inventory.modules[0].effectCount=2;s.slots[0].inventory.modules.push({instanceId:'fibre',definitionId:'MOD002'});localStorage.setItem('nehan_alpha_v1',JSON.stringify(s))});await p.reload();await p.locator('#splash').click();await p.locator('#splash').waitFor({state:'detached'});await p.locator('[data-nav="inventory"]').click();await p.locator('[data-nav="inventory"]').click();await p.locator('[data-inventory-tab="modules"]').click();
  s=await read(p);const weapon=s.slots[0].weapon.instanceId,memory=s.slots[0].memories[0].instanceId;
  for(const [module,target] of [[lootId,weapon],['fibre',memory]]){
   await p.locator(`[data-install-module="${module}"]`).click();await p.locator(`[data-install-target="${target}"]`).click();assert((await p.locator('.install-card').innerText()).includes('取り外せません'));await p.locator('#cancelInstall').click();assert.equal((await read(p)).slots[0].inventory.modules.length,module===lootId?2:1);
   await p.locator(`[data-install-module="${module}"]`).click();await p.locator(`[data-install-target="${target}"]`).click();await p.locator('#confirmInstall').click();
  }
  s=await read(p);assert.equal(s.slots[0].inventory.modules.length,0);assert.equal(s.slots[0].weapon.modules.length,1);assert.equal(s.slots[0].memories[0].modules.length,1);assert.equal(s.slots[0].stats.STR,20);assert.equal(s.slots[0].stats.DEX,20);assert((await p.locator('.inventory-heading').innerText()).includes('STR 20 → 28'));assert((await p.locator('.inventory-heading').innerText()).includes('DEX 20 → 14'));if(process.env.SCREENSHOT_DIR){await p.locator('[data-inventory-tab="equipped"]').click();await p.screenshot({path:`${process.env.SCREENSHOT_DIR}/modules-equipped.png`});}
  await p.reload();await p.locator('#splash').click();await p.locator('#splash').waitFor({state:'detached'});await p.locator('[data-nav="play"]').click();await p.locator('[data-slot="0"]').click();await p.locator('[data-route="L"]').click();const before=(await read(p)).run.combat.enemy.hp;await p.locator('#weaponBtn').click();assert.equal((await read(p)).run.combat.enemy.hp,before-Math.round(9*(1+Math.sqrt(28)*.12)));
  await p.waitForTimeout(1500);const hp=(await read(p)).run.combat.enemy.hp;await p.locator('[data-memory="0"]').click();assert.equal((await read(p)).run.combat.enemy.hp,Math.max(0,hp-Math.round(16*(1+Math.sqrt(28)*.12))));
 }
 assert.deepEqual(errors,[]);console.log(`${kind}: kill/feedback → loot/reload → collect/map/inventory${kind==='MODULE'?' → install/cancel/reload/effective combat':''} PASS`);await p.close();
}
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
