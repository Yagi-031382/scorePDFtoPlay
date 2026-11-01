// Experimental geometric detector. Coordinates are in the original canvas space.
export function findStaves(gray,w,h){
 const rows=[];for(let y=0;y<h;y++){let n=0;for(let x=0;x<w;x++)if(gray[y*w+x]<130)n++;if(n>w*.32)rows.push(y)}
 const lines=[];for(const y of rows){const last=lines.at(-1);if(last&&y-last.at(-1)<=2)last.push(y);else lines.push([y])}
 const centers=lines.map(a=>a.reduce((x,y)=>x+y,0)/a.length),out=[];
 for(let i=0;i+4<centers.length;i++){const a=centers.slice(i,i+5),d=(a[4]-a[0])/4;if(d<4)continue;if(a.slice(1).every((y,j)=>Math.abs(y-a[j]-d)<d*.22)){out.push({lines:a,gap:d,clef:out.length%2?'bass':'treble'});i+=4}}
 return out;
}
export function pitchAt(y,staff,key=0){const steps=Math.round((staff.lines[4]-y)/(staff.gap/2));const base=staff.clef==='bass'?18:30;const diatonic=base+steps;const degree=((diatonic%7)+7)%7;const octave=Math.floor(diatonic/7);let midi=12*(octave+1)+[0,2,4,5,7,9,11][degree];if(key<0&&[6,2].slice(0,-key).includes(degree))midi--;if(key>0&&degree===3)midi++;return midi}
export function detectHeads(gray,w,h,staves,key){const found=[];
 for(let si=0;si<staves.length;si++){const s=staves[si],g=s.gap;const candidates=[];
 for(let y=Math.max(0,Math.floor(s.lines[0]-g*2));y<Math.min(h-g,s.lines[4]+g*2);y+=Math.max(1,Math.floor(g/5)))for(let x=Math.floor(w*.08);x<w-g;x+=Math.max(1,Math.floor(g/5))){let ink=0,total=0;for(let dy=-Math.floor(g*.28);dy<=g*.28;dy++)for(let dx=-Math.floor(g*.45);dx<=g*.45;dx++){const yy=y+dy,xx=x+dx;if(s.lines.some(l=>Math.abs(yy-l)<1.3))continue;total++;if(gray[yy*w+xx]<130)ink++}if(total&&ink/total>.78)candidates.push({x,y,score:ink/total})}
 candidates.sort((a,b)=>b.score-a.score);const selected=[];for(const c of candidates)if(!selected.some(a=>Math.abs(a.x-c.x)<g*.85&&Math.abs(a.y-c.y)<g*.65))selected.push(c);
 selected.sort((a,b)=>a.x-b.x);let beat=-1,last=-999;for(const c of selected){if(c.x-last>g*.9){beat++;last=c.x}found.push({...c,staff:si,midi:pitchAt(c.y,s,key),beat,duration:1})}
 }return found;
}
export function midiFile(notes,bpm){const bytes=[],u16=n=>[n>>8&255,n&255],u32=n=>[n>>>24,n>>>16&255,n>>>8&255,n&255],str=s=>[...s].map(c=>c.charCodeAt(0)),vl=n=>{let a=[n&127];while(n>>=7)a.unshift((n&127)|128);return a};const events=[];for(const n of notes){events.push({t:Math.round(n.beat*480),b:[0x90,n.midi,80]},{t:Math.round((n.beat+n.duration)*480),b:[0x80,n.midi,0]})}events.sort((a,b)=>a.t-b.t||a.b[0]-b.b[0]);const us=Math.round(60000000/bpm);bytes.push(0,255,81,3,us>>16&255,us>>8&255,us&255);let last=0;for(const e of events){bytes.push(...vl(e.t-last),...e.b);last=e.t}bytes.push(0,255,47,0);return new Uint8Array([...str('MThd'),...u32(6),...u16(0),...u16(1),...u16(480),...str('MTrk'),...u32(bytes.length),...bytes])}
