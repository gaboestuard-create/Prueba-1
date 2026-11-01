const {chromium}=require('playwright');
const [,, mode, outDir, ...rest]=process.argv;
const fs=require('fs');fs.mkdirSync(outDir,{recursive:true});
(async()=>{
 const b=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:1080,height:1920}});
 p.on('pageerror',e=>console.log('PAGEERR',e.message));p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
 await p.goto('http://127.0.0.1:8766/index.html');await p.evaluate(()=>window.ready);
 const el=await p.$('#stage');
 if(mode==='stills'){for(const t of rest){await p.evaluate(t=>window.render(t),+t);await el.screenshot({path:`${outDir}/s_${(+t).toFixed(2)}.png`});}}
 else{const [a,z,fps]=rest.map(Number);for(let i=a;i<z;i++){await p.evaluate(t=>window.render(t),i/fps);await el.screenshot({path:`${outDir}/f${String(i).padStart(5,'0')}.jpg`,type:'jpeg',quality:93});}}
 await b.close();
})();
