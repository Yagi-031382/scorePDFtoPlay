import {test} from 'node:test';import assert from 'node:assert/strict';import {findStaves,pitchAt,detectHeads,midiFile} from './omr.js';
test('synthetic staff and solid note detection',()=>{const w=500,h=200,g=new Uint8Array(w*h).fill(255);for(const y of [60,72,84,96,108])for(let x=20;x<480;x++)g[y*w+x]=0;for(let y=98;y<=106;y++)for(let x=196;x<=204;x++)g[y*w+x]=0;const s=findStaves(g,w,h);assert.equal(s.length,1);assert.equal(pitchAt(108,s[0]),64);assert.equal(pitchAt(102,s[0]),65);assert.equal(pitchAt(90,s[0],-1),69);assert.ok(detectHeads(g,w,h,s,0).some(n=>Math.abs(n.x-200)<10));});
test('bass pitch and flat key signature',()=>{const s={lines:[60,72,84,96,108],gap:12,clef:'bass'};assert.equal(pitchAt(108,s),43);assert.equal(pitchAt(96,s,-1),46)});
test('MIDI header, timing and note events',()=>{const b=midiFile([{midi:60,beat:0,duration:1}],120);assert.equal(new TextDecoder().decode(b.slice(0,4)),'MThd');assert.deepEqual([...b.slice(22,29)],[0,255,81,3,7,161,32]);assert.ok([...b].includes(144));assert.deepEqual([...b.slice(-4)],[0,255,47,0])});

function hollowFixture(gap,withStem,onLine=false){
 const w=500,h=300,a=new Uint8Array(w*h).fill(255),lines=[80,80+gap,80+2*gap,80+3*gap,80+4*gap];
 for(const y of lines)for(let x=10;x<w-10;x++)a[y*w+x]=0;
 const cx=200,cy=lines[3]+(onLine?0:gap/2),rx=gap*(withStem?.65:.8),ry=gap*.36;
 for(let y=0;y<h;y++)for(let x=180;x<225;x++){const d=((x-cx)/rx)**2+((y-cy)/ry)**2;if(d>.48&&d<1.2)a[y*w+x]=0}
 if(withStem)for(let y=Math.round(cy-gap*2.7);y<=cy;y++)a[y*w+Math.round(cx+rx)]=0;
 return {a,w,h,cx,cy,s:{lines,gap,clef:'treble'}};
}
for(const gap of [10,14,20])for(const stem of [false,true])for(const onLine of [false,true])test(`hollow ${stem?'half':'whole'} gap=${gap} onLine=${onLine}`,()=>{
 const f=hollowFixture(gap,stem,onLine),notes=detectHeads(f.a,f.w,f.h,[f.s],0);
 const near=notes.filter(n=>Math.abs(n.x-f.cx)<gap*.6&&Math.abs(n.y-f.cy)<gap*.3);
 assert.equal(near.length,1,JSON.stringify(notes));assert.equal(near[0].duration,stem?2:4);assert.equal(near[0].midi,pitchAt(f.cy,f.s));
});
test('empty staff and isolated stems are not hollow notes',()=>{const f=hollowFixture(14,false);for(let y=0;y<f.h;y++)for(let x=180;x<225;x++)f.a[y*f.w+x]=f.s.lines.includes(y)?0:255;for(let y=90;y<140;y++)f.a[y*f.w+300]=0;assert.equal(detectHeads(f.a,f.w,f.h,[f.s],0).filter(n=>n.kind!=='filled').length,0)});
