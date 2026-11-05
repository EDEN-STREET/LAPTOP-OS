/* EDEN Ultimate Hub visual QA. Browser UI only; no device or network mutation. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root=path.resolve(__dirname,'..');
const artifacts=path.join(__dirname,'artifacts-ultimate');
fs.mkdirSync(artifacts,{recursive:true});
const report={project:'EDEN LAPTOP-OS',module:'ultimate-hub',execution:'browser-ui-only',date:new Date().toISOString(),checks:[],screenshots:[],errors:[]};

async function run(){
  const { buildServer }=await import('../lib/server.mjs');
  const server=buildServer(path.join(root,'web'));
  const browser=await chromium.launch({headless:true});
  try{
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
    const origin='http://127.0.0.1:'+server.address().port;
    const check=async(name,fn)=>{try{const detail=await fn();report.checks.push({name,status:'PASS',detail:String(detail||'')});console.log('PASS '+name)}catch(err){report.checks.push({name,status:'FAIL',detail:String(err?.message||err)});report.errors.push(name+': '+err.message);console.error('FAIL '+name+': '+err.message)}};
    for(const [name,viewport] of [['desktop',{width:1440,height:920}],['mobile',{width:390,height:844}]]){
      const context=await browser.newContext({viewport,deviceScaleFactor:2});
      const page=await context.newPage();
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await check(name+' · Ultimate Hub',async()=>{
        const r=await page.goto(origin+'/ultimate-hub.html',{waitUntil:'domcontentloaded'});assert.equal(r.status(),200);
        assert.match(await page.locator('h1').innerText(),/Ein Hub/);
        assert.ok(await page.locator('#toolGrid .toolcard').count()>=20);
        await page.locator('#toolSearch').fill('Image Studio');
        assert.equal(await page.locator('#toolGrid .toolcard').count(),1);
        await page.locator('#toolSearch').fill('');
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+4);assert.equal(overflow,false);assert.deepEqual(errors,[]);
        const file=path.join(artifacts,'ultimate-hub-'+name+'.png');await page.screenshot({path:file,fullPage:true,animations:'disabled'});assert.ok(fs.statSync(file).size>7000);report.screenshots.push({name,filename:path.basename(file),bytes:fs.statSync(file).size});
        return 'hub registry/filter render';
      });
      await check(name+' · Toolbox registry',async()=>{
        await page.goto(origin+'/toolbox.html',{waitUntil:'domcontentloaded'});
        assert.ok(await page.locator('#grid .toolcard').count()>=20);
        await page.locator('#q').fill('Markdown');
        assert.equal(await page.locator('#grid .toolcard').count(),1);
        return 'toolbox registry filter';
      });
      await check(name+' · Image Studio shell',async()=>{
        await page.goto(origin+'/image-studio.html',{waitUntil:'domcontentloaded'});
        assert.equal(await page.locator('#export').isDisabled(),true);
        assert.equal(await page.locator('#addLayer').isDisabled(),true);
        assert.match(await page.locator('h1').innerText(),/Bildbearbeitung/);
        const file=path.join(artifacts,'image-studio-'+name+'.png');await page.screenshot({path:file,fullPage:true,animations:'disabled'});assert.ok(fs.statSync(file).size>6000);report.screenshots.push({name:'image-'+name,filename:path.basename(file),bytes:fs.statSync(file).size});
        return 'safe initial state';
      });
      await check(name+' · Utility Lab JSON',async()=>{
        await page.goto(origin+'/local-tools.html',{waitUntil:'domcontentloaded'});
        await page.locator('[data-tab="json"]').click();
        await page.locator('#jsonIn').fill('{"eden":true}');
        await page.locator('#jsonFormat').click();
        assert.match(await page.locator('#jsonStatus').innerText(),/Gültiges JSON/);
        assert.match(await page.locator('#jsonOut').inputValue(),/"eden": true/);
        return 'local JSON formatting';
      });
      await check(name+' · Academy and Support',async()=>{
        await page.goto(origin+'/academy.html',{waitUntil:'domcontentloaded'});
        assert.equal(await page.locator('#lessons button').count(),5);
        await page.locator('#markDone').click();assert.match(await page.locator('#lessonStatus').innerText(),/gelernt/);
        await page.goto(origin+'/support.html',{waitUntil:'domcontentloaded'});
        await page.locator('#topics button').nth(1).click();assert.match(await page.locator('#resultText').innerText(),/reproduzieren/i);
        return 'learning and diagnostic interactions';
      });
      await check(name+' · Markdown and Diff',async()=>{
        await page.goto(origin+'/markdown-studio.html',{waitUntil:'domcontentloaded'});
        await page.locator('#src').fill('# Test\n\n- A');assert.match(await page.locator('#preview').innerText(),/Test/);
        await page.goto(origin+'/diff-studio.html',{waitUntil:'domcontentloaded'});
        await page.locator('#a').fill('A\nB');await page.locator('#b').fill('A\nC');await page.locator('#compare').click();
        assert.ok(await page.locator('.removed').count()>=1);assert.ok(await page.locator('.added').count()>=1);
        return 'local writing/diff interactions';
      });
      await check(name+' · semantic baseline',async()=>{
        const screens=['ultimate-hub.html','toolbox.html','image-studio.html','local-tools.html','academy.html','support.html','markdown-studio.html','diff-studio.html'];
        const failed=[];
        for(const screen of screens){errors.length=0;const r=await page.goto(origin+'/'+screen,{waitUntil:'domcontentloaded'});const audit=await page.evaluate(()=>({title:document.title.trim(),text:document.body.innerText.trim().length,overflow:document.documentElement.scrollWidth>innerWidth+4,dup:(()=>{const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);return ids.length-new Set(ids).size})(),unnamed:[...document.querySelectorAll('button')].filter(x=>!x.textContent.trim()&&!x.getAttribute('aria-label')).length}));if(r.status()!==200||!audit.title||audit.text<80||audit.overflow||audit.dup||audit.unnamed||errors.length)failed.push(screen+': '+JSON.stringify({status:r.status(),audit,errors}))}
        assert.deepEqual(failed,[]);return screens.length+' screens semantic/mobile baseline';
      });
      await context.close();
    }
  }finally{await browser.close();await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))}
}
run().catch(err=>report.errors.push('Runner: '+String(err?.stack||err))).finally(()=>{report.result=report.errors.length?'FAIL':'PASS';report.finished=new Date().toISOString();fs.writeFileSync(path.join(artifacts,'ultimate-hub-qa-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,checks:report.checks.length,errors:report.errors.length,screenshots:report.screenshots.length}));process.exitCode=report.errors.length?1:0});
