// Experimental geometric detector. Coordinates are in the original canvas space.
export function findStaves(gray,w,h){
 const rows=[];for(let y=0;y<h;y++){let n=0;for(let x=0;x<w;x++)if(gray[y*w+x]<130)n++;if(n>w*.32)rows.push(y)}
 const lines=[];for(const y of rows){const last=lines.at(-1);if(last&&y-last.at(-1)<=2)last.push(y);else lines.push([y])}
 const centers=lines.map(a=>a.reduce((x,y)=>x+y,0)/a.length),out=[];
 for(let i=0;i+4<centers.length;i++){const a=centers.slice(i,i+5),d=(a[4]-a[0])/4;if(d<4)continue;if(a.slice(1).every((y,j)=>Math.abs(y-a[j]-d)<d*.22)){out.push({lines:a,gap:d,clef:out.length%2?'bass':'treble'});i+=4}}
 return out;
}
export function pitchAt(y,staff,key=0){const steps=Math.round((staff.lines[4]-y)/(staff.gap/2));const base=staff.clef==='bass'?18:30;const diatonic=base+steps;const degree=((diatonic%7)+7)%7;const octave=Math.floor(diatonic/7);let midi=12*(octave+1)+[0,2,4,5,7,9,11][degree];if(key<0&&[6,2].slice(0,-key).includes(degree))midi--;if(key>0&&degree===3)midi++;return midi}
// Match an elliptical ink rim around a white interior, ignoring staff-line pixels.
// Pitch centers are constrained to half-space positions; stems distinguish halves.
function hollowHeads(gray,w,h,s){
 const g=s.gap,result=[];
 const ink=(x,y)=>x>=0&&x<w&&y>=0&&y<h&&gray[Math.round(y)*w+Math.round(x)]<130;
 const onLine=y=>s.lines.some(l=>Math.abs(y-l)<=Math.max(1,g*.09));
 for(let step=-4;step<=12;step++){
  const y=s.lines[4]-step*g/2;
  for(let x=Math.ceil(w*.08);x<w-g;x++){
   let best=null;
   for(const width of [.60,.72,.85])for(const tilt of [-.28,0,.28]){
    const rx=g*width,ry=g*.36;let rim=0,rimN=0,inside=0,insideN=0;
    for(let dy=-Math.ceil(ry);dy<=Math.ceil(ry);dy++){
     if(onLine(y+dy))continue;
     for(let dx=-Math.ceil(rx);dx<=Math.ceil(rx);dx++){
      const d=(dx/rx)**2+((dy-tilt*dx)/ry)**2;
      if(d>=.55&&d<=1.25){rimN++;if(ink(x+dx,y+dy))rim++}
      if(d<.38){insideN++;if(ink(x+dx,y+dy))inside++}
     }
    }
    if(rimN<10||insideN<2||rim/rimN<.65||inside/insideN>.2)continue;
    const score=rim/rimN-inside/insideN;
    if(!best||score>best.score)best={x,y,rx,score};
   }
   if(!best)continue;
   let stem=false;
   for(const side of [-1,1])for(let dx=Math.floor(g*.35);dx<=Math.ceil(g*.95);dx++){
    let run=0;
    for(let dy=Math.ceil(g*.65);dy<=Math.ceil(g*2.8);dy++){
     if(ink(x+side*dx,y-side*dy))run++;else run=0;
     if(run>=g*1.15){stem=true;break}
    }
   }
   result.push({...best,kind:stem?'half':'whole',duration:stem?2:4});
  }
 }
 return result;
}
export function detectHeads(gray,w,h,staves,key){const found=[];
 for(let si=0;si<staves.length;si++){const s=staves[si],g=s.gap;const candidates=[];
 for(let y=Math.max(0,Math.floor(s.lines[0]-g*2));y<Math.min(h-g,s.lines[4]+g*2);y+=Math.max(1,Math.floor(g/5)))for(let x=Math.floor(w*.08);x<w-g;x+=Math.max(1,Math.floor(g/5))){let ink=0,total=0;for(let dy=-Math.floor(g*.28);dy<=g*.28;dy++)for(let dx=-Math.floor(g*.45);dx<=g*.45;dx++){const yy=y+dy,xx=x+dx;if(s.lines.some(l=>Math.abs(yy-l)<1.3))continue;total++;if(gray[yy*w+xx]<130)ink++}if(total&&ink/total>.78)candidates.push({x,y,score:ink/total})}
 candidates.push(...hollowHeads(gray,w,h,s).map(c=>({...c,score:c.score+1})));
 candidates.sort((a,b)=>b.score-a.score);const selected=[];for(const c of candidates)if(!selected.some(a=>Math.abs(a.x-c.x)<g*.85&&Math.abs(a.y-c.y)<g*.65))selected.push(c);
 selected.sort((a,b)=>a.x-b.x);let beat=-1,last=-999;for(const c of selected){if(c.x-last>g*.9){beat++;last=c.x}found.push({...c,staff:si,midi:pitchAt(c.y,s,key),beat,duration:c.duration??1,kind:c.kind??'filled'})}
 }return found;
}
export function midiFile(notes,bpm){const bytes=[],u16=n=>[n>>8&255,n&255],u32=n=>[n>>>24,n>>>16&255,n>>>8&255,n&255],str=s=>[...s].map(c=>c.charCodeAt(0)),vl=n=>{let a=[n&127];while(n>>=7)a.unshift((n&127)|128);return a};const events=[];for(const n of notes){events.push({t:Math.round(n.beat*480),b:[0x90,n.midi,80]},{t:Math.round((n.beat+n.duration)*480),b:[0x80,n.midi,0]})}events.sort((a,b)=>a.t-b.t||a.b[0]-b.b[0]);const us=Math.round(60000000/bpm);bytes.push(0,255,81,3,us>>16&255,us>>8&255,us&255);let last=0;for(const e of events){bytes.push(...vl(e.t-last),...e.b);last=e.t}bytes.push(0,255,47,0);return new Uint8Array([...str('MThd'),...u32(6),...u16(0),...u16(1),...u16(480),...str('MTrk'),...u32(bytes.length),...bytes])}
