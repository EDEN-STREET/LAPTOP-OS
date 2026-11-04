/* EDEN Reboot-Plan visual QA. No real boot, device or network mutations. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const artifacts = path.join(__dirname, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });
const report = { project:'EDEN LAPTOP-OS', module:'reboot-plan', execution:'browser-ui-only',
  date:new Date().toISOString(), checks:[], screenshots:[], errors:[] };

async function run() {
  const { buildServer } = await import('../lib/server.mjs');
  const server=buildServer(path.join(root,'web'));
  const browser=await chromium.launch({headless:true});
  try {
    await new Promise((resolve,reject)=>{
      server.once('error',reject);
      server.listen(0,'127.0.0.1',resolve);
    });
    const origin='http://127.0.0.1:'+server.address().port;
    const check=async(name,fn)=>{
      try { const msg=await fn(); report.checks.push({name,status:'PASS',detail:String(msg||'')});console.log('PASS '+name); }
      catch(err){report.checks.push({name,status:'FAIL',detail:String(err?.message||err)});report.errors.push(name+': '+err.message);console.error('FAIL '+name+': '+err.message);}
    };
    for(const [name,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]) {
      const context=await browser.newContext({viewport,deviceScaleFactor:2});
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await check(name+' · render and gate statuses',async()=>{
        const res=await page.goto(origin+'/reboot-plan.html',{waitUntil:'domcontentloaded'});
        assert.equal(res.status(),200);
        assert.match(await page.locator('h1').innerText(),/Reboot-to-Installer/);
        assert.equal(await page.locator('.timeline li').count(),8);
        assert.match(await page.locator('.status').innerText(),/INSTALLATION GESPERRT/);
        assert.match(await page.locator('.alert').innerText(),/keine Windows-Partition/i);
        assert.equal(await page.locator('a[href="https://www.qubes-os.org/doc/system-requirements/"]').count(),1);
        assert.equal(errors.length,0,JSON.stringify(errors));
        return '8/8 stages displayed; no browser errors';
      });
      await check(name+' · non-privileged interaction',async()=>{
        const btn=page.locator('#details'),p=page.locator('#terminal');
        assert.equal(await p.isVisible(),false);
        await btn.click();
        assert.equal(await btn.getAttribute('aria-expanded'),'true');
        assert.equal(await p.isVisible(),true);
        assert.match(await p.innerText(),/reboot-plan --json/);
        await btn.click();
        assert.equal(await p.isVisible(),false);
        return 'Only local instructions toggled';
      });
      await check(name+' · semantic and responsive layout',async()=>{
        const audit=await page.evaluate(()=>{
          const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);
          return {
            duplicates:ids.length-new Set(ids).size,
            unnamedButtons:[...document.querySelectorAll('button')].filter(x=>!x.textContent.trim()&&!x.getAttribute('aria-label')).length,
            badLinks:[...document.querySelectorAll('a')].filter(x=>!x.textContent.trim()&&!x.getAttribute('aria-label')).length,
            horizontalOverflow:document.documentElement.scrollWidth>innerWidth+3,
          };
        });
        assert.deepEqual(audit,{duplicates:0,unnamedButtons:0,badLinks:0,horizontalOverflow:false});
        const file=path.join(artifacts,'reboot-plan-'+name+'.png');
        await page.screenshot({path:file,fullPage:true,animations:'disabled'});
        const bytes=fs.statSync(file).size;
        assert.ok(bytes>6000,'Screenshot must be nonblank');
        report.screenshots.push({name,filename:path.basename(file),bytes});
        return JSON.stringify(audit);
      });
      await check(name+' · linked from existing setup page',async()=>{
        const res=await page.goto(origin+'/setup.html',{waitUntil:'domcontentloaded'});
        assert.equal(res.status(),200);
        const link=page.locator('a[href="reboot-plan.html"]').first();
        assert.ok(await link.count());
        await link.click();
        await page.waitForURL(origin+'/reboot-plan.html');
        return 'setup → reboot-plan navigation';
      });
      await check(name+' · Gate-5 hardware read-only visualization',async()=>{
        const res=await page.goto(origin+'/hardware-readiness.html',{waitUntil:'domcontentloaded'});
        assert.equal(res.status(),200);
        assert.equal(await page.locator('.gates li').count(),10);
        assert.match(await page.locator('h1').innerText(),/Hardware-Preflight/);
        assert.match(await page.locator('.notice').innerText(),/keine unabhängigen Nachweise/);
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+3);
        assert.equal(overflow,false,'No horizontal overflow');
        assert.equal(errors.length,0,JSON.stringify(errors));
        const file=path.join(artifacts,'hardware-readiness-'+name+'.png');
        await page.screenshot({path:file,fullPage:true,animations:'disabled'});
        const bytes=fs.statSync(file).size;
        assert.ok(bytes>6000,'Nonblank Gate-5 screenshot');
        report.screenshots.push({name:'hardware-'+name,filename:path.basename(file),bytes});
        return '10/10 gates; honest UNKNOWN labels; desktop/mobile no overflow';
      });
      await check(name+' · complete application screen inventory',async()=>{
        const screens=[
          'index.html','setup.html','builder.html','handbuch.html','toolbox.html',
          'grimoire.html','testlab.html','quellen.html','wiki.html','projects.html',
          'security-architecture.html','reboot-plan.html','hardware-readiness.html',
        ];
        const failed=[];
        for(const screen of screens){
          errors.length=0;
          const response=await page.goto(origin+'/'+screen,{waitUntil:'domcontentloaded'});
          if(response.status()!==200){failed.push(screen+': HTTP '+response.status());continue;}
          const details=await page.evaluate(()=>({
            visibleText:document.body.innerText.trim().length,
            title:document.title.trim(),
            overflow:document.documentElement.scrollWidth>window.innerWidth+4,
          }));
          if(details.visibleText<70||!details.title||details.overflow||errors.length){
            failed.push(screen+': '+JSON.stringify({details,errors}));
          }
          const file=path.join(artifacts,'full-suite-'+screen.replace('.html','')+'-'+name+'.png');
          await page.screenshot({path:file,fullPage:false,animations:'disabled'});
          const bytes=fs.statSync(file).size;
          if(bytes<3500)failed.push(screen+': screenshot is blank');
          report.screenshots.push({name:screen+' '+name,filename:path.basename(file),bytes});
        }
        assert.deepEqual(failed,[]);
        return screens.length+' complete screens rendered; no blank, broken, error or horizontal overflow';
      });
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
  }
}

run().catch(err=>report.errors.push('Runner: '+String(err?.stack||err)))
  .finally(()=>{
    report.result=report.errors.length?'FAIL':'PASS';
    report.finished=new Date().toISOString();
    fs.writeFileSync(path.join(artifacts,'reboot-plan-qa-report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({result:report.result,checks:report.checks.length,
      errors:report.errors.length,screenshots:report.screenshots.length}));
    process.exitCode=report.errors.length?1:0;
  });
