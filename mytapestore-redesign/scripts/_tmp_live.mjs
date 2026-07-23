import { chromium } from 'playwright'
const SC='/private/tmp/claude-501/-Users-garvbahl-Documents-Projects-HooknLoop-MyTapeStore/5e8057e7-9d14-4c73-a88b-102a4d8db8f9/scratchpad'
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1360,height:820}})
const resp=await p.goto('https://mytapestore-redesign.vercel.app',{waitUntil:'load',timeout:30000})
console.log('HTTP status:', resp.status())
await p.waitForSelector('.hslide__title, h1', {timeout:15000}).catch(()=>{})
await p.waitForTimeout(2500)
await p.screenshot({path:`${SC}/live_home.png`,clip:{x:0,y:0,width:1360,height:760}})
const h1=await p.evaluate(()=>document.querySelector('h1')?.textContent||'(no h1)')
console.log('hero h1:', h1)
await b.close()
