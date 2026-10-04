const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-gpu','--no-zygote'],...(process.env.BASE_URL&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
 const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,ignoreHTTPSErrors:true}),errors=[],fontRequests=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/misaki|\.woff|\.ttf/i.test(r.url()))fontRequests.push(r.url())});
 const memories=['M001','M002','M003','M004'].map((definitionId,i)=>({definitionId,instanceId:`memory-${i}`,rarity:'COMMON',currentCT:0,breakageRate:i===1?98.5:0,broken:false,modules:[]}));
 const c={id:'font-body',name:'可読性試験',jobId:'JOB_BOUNTY_HUNTER',stats:{VIT:6,STR:8,DEX:7,INT:5},maxHp:42,hp:10,weapon:{id:'W001',instanceId:'weapon',name:'鉄管ブレード',basePower:9,hit:90,mainStat:'STR',hitCount:1,rarity:'COMMON',modules:[]},memories,inventory:{weapons:[],memories:[],modules:[{instanceId:'unused',definitionId:'MOD001'}]},depth:30,wins:0,createdAt:1};
 const route=(side,type)=>({id:side,side,type,enemyId:'E01',future:[{type:'garage'},{type:'scrap'}]});
 const fixture={slots:[c,null,null],activeSlot:0,screen:'home',run:{ownerId:c.id,phase:'map',depth:30,shield:0,combat:null,routes:[route('L','battle'),route('R','garage')],log:[]}};
 const read=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('nehan_alpha_v1')));
 await p.addInitScript(f=>{Math.random=()=>.5;if(!localStorage.getItem('nehan_alpha_v1'))localStorage.setItem('nehan_alpha_v1',JSON.stringify(f))},fixture);
 async function fonts(label){
  const bad=await p.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>e.getClientRects().length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).filter(e=>/pixel|misaki/i.test(getComputedStyle(e).fontFamily)).map(e=>e.tagName+': '+e.textContent));
  assert.deepEqual(bad,[],`${label} uses normal fonts`);
 }
 await p.goto(process.env.BASE_URL||'http://localhost:8765');await fonts('splash');await p.locator('#splash').click();await p.locator('#splash').waitFor({state:'detached'});await fonts('home');
 await p.locator('[data-nav="play"]').click();await fonts('play');await p.locator('[data-new="1"]').click();await fonts('create');await p.locator('[data-edit="name"]').click();await fonts('name editor');await p.locator('#confirmCreationEdit').click();await p.locator('#creationBack').click();await p.locator('[data-slot="0"]').click();await fonts('map');
 await p.locator('#playerDetails').click();await fonts('module install');await p.locator('[data-install-target="weapon"]').click();await p.locator('[data-install-slot="0"]').click();await p.locator('[data-pick-module="unused"]').click();await fonts('install confirmation');await p.locator('#cancelInstall').click();await p.locator('.module-install-back').click();
 await p.locator('[data-route="R"]').click();await fonts('garage');await p.locator('#leaveGarage').click();
 // Return to the saved battle route without changing production game rules.
 await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('nehan_alpha_v1'));s.run.routes[0]={id:'battle',side:'L',type:'battle',enemyId:'E01',future:[{type:'scrap'},{type:'garage'}]};localStorage.setItem('nehan_alpha_v1',JSON.stringify(s))});
 await p.reload();await p.locator('#splash').click();await p.locator('#splash').waitFor({state:'detached'});await p.locator('[data-nav="play"]').click();await p.locator('[data-slot="0"]').click();await p.locator('[data-route="L"]').click();await fonts('combat');
 let before=await read();await p.locator('[data-memory="1"]').click();let after=await read();
 assert(after.run.combat.enemy.hp<before.run.combat.enemy.hp);assert.equal(after.slots[0].memories[1].breakageRate,100);assert(after.slots[0].memories[1].broken);assert.equal(await p.locator('[data-memory="1"]').getAttribute('aria-disabled'),'true');assert.equal(await p.locator('[data-memory="1"] .action-ct').innerText(),'×');
 await p.waitForTimeout(850);before=await read();await p.locator('[data-memory="1"]').click({force:true});assert.deepEqual(await read(),before);
 const button=await p.locator('[data-memory="1"]').boundingBox();await p.mouse.move(button.x+button.width/2,button.y+button.height/2);await p.mouse.down();await p.waitForTimeout(420);assert((await p.locator('#actionDescription').innerText()).includes('0.0〜3.0%'));assert((await p.locator('#actionDescription').innerText()).includes('100%で使用不能'));await fonts('long press');await p.mouse.up();
 await p.reload();await p.locator('#splash').click();await p.locator('#splash').waitFor({state:'detached'});await p.locator('[data-nav="play"]').click();await p.locator('[data-slot="0"]').click();assert((await read()).slots[0].memories[1].broken);assert.equal((await read()).slots[0].memories[1].breakageRate,100);
 await p.locator('#exitRun').click();await p.locator('[data-nav="inventory"]').click();await p.locator('[data-nav="inventory"]').click();await fonts('inventory');
 // A saved scrap preview retains its node and layout; its screen also uses normal fonts.
 await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('nehan_alpha_v1'));s.run.phase='map';s.run.combat=null;s.run.routes[0]={id:'scrap',side:'L',type:'scrap',future:[{type:'battle',enemyId:'E01'},{type:'garage'}]};localStorage.setItem('nehan_alpha_v1',JSON.stringify(s))});
 await p.reload();await p.locator('#splash').click();await p.locator('#splash').waitFor({state:'detached'});await p.locator('[data-nav="play"]').click();await p.locator('[data-slot="0"]').click();await p.locator('[data-route="L"]').click();await fonts('scrap');
 assert.deepEqual(fontRequests,[]);assert.deepEqual(errors,[]);console.log('All screens/editors/dialogs normal fonts, no pixel font requests; real threshold-crossing damage, BROKEN guard, tooltip and reload PASS');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
