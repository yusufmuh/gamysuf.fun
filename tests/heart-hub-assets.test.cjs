'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {GAMES,heartMomentImage,HEART_HOST_IDS,HEART_SERVICE_IDS}=require('../hub/registry.cjs');
const {Players}=require('../hub/players.cjs');
const {copy}=require('../scripts/sync-games.cjs');
const {collectHeartReleaseAssets}=require('../scripts/verify-deployment.cjs');

function temporary(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'heart-hub-assets-'));
 t.after(()=>{assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true});});
 return dir;
}
const state={hosts:HEART_HOST_IDS.map(id=>({id,name:id==='zoro'?'Zoro':'Sanji',image:`/assets/characters/${id}.webp`})),services:HEART_SERVICE_IDS.map(id=>({id,name:id}))};
const heart=GAMES.find(game=>game.slug==='heart');
const expectedAssets=[
 ...state.hosts.flatMap(host=>state.services.map(service=>`assets/moments/${host.id}-${service.id}.webp`)),
 ...HEART_SERVICE_IDS.map(id=>`assets/bipy-variants/bipy-${id}.webp`),
 ...['pink','jade','gold'].map(id=>`assets/brand/bipy-${id}.webp`),
 'assets/video/grand-line-promo-poster.webp',
 'assets/audio/bpedia-main-bgm.mp3','assets/audio/bpedia-home-suite.mp3',
 ...HEART_HOST_IDS.flatMap(host=>HEART_SERVICE_IDS.map(service=>`assets/video/moments/${host}-${service}.mp4`)),
 ...HEART_HOST_IDS.map(host=>`assets/dealers/${host}.webp`)
];

test('Heart album and server results agree on fourteen unique moment artworks and stable IDs',()=>{
 const cards=heart.cards(state);
 assert.equal(cards.length,14);
 assert.equal(new Set(cards.map(card=>card.cardId)).size,14);
 assert.equal(new Set(cards.map(card=>card.image)).size,14);
 for(const host of state.hosts)for(const service of state.services){
  const card=cards.find(item=>item.cardId===`${host.id}-${service.id}`);
  assert.equal(card.image,`/assets/moments/${host.id}-${service.id}.webp`);
  assert.deepEqual(heart.extract('/api/play',{host,service}),card);
 }
 assert.equal(heart.extract('/api/play',{host:{id:'unknown'},service:state.services[0]}),null);
 assert.equal(heartMomentImage('zoro','../../secret'),null);
});

test('legacy Heart ownership refreshes art without changing XP, duplicates, dates or retry history',t=>{
 const file=path.join(temporary(t),'players.json');
 const now=()=>Date.parse('2026-10-03T04:00:00Z');
 const players=new Players(file,{now});
 const id='a'.repeat(32);
 const outcome={...heart.extract('/api/play',{host:state.hosts[0],service:state.services[0]}),image:'/g/heart/assets/characters/zoro.webp'};
 players.record(id,{slug:'heart',outcome,requestKey:'heart:legacy'});
 players.record(id,{slug:'heart',outcome,requestKey:'heart:legacy-second'});
 const original=structuredClone(players.ensure(id));
 players.flush();
 const restored=new Players(file,{now});
 const migrated=restored.ensure(id);
 assert.equal(migrated.cards['heart:zoro-cinderella'].image,'/g/heart/assets/moments/zoro-cinderella.webp');
 original.cards['heart:zoro-cinderella'].image=migrated.cards['heart:zoro-cinderella'].image;
 assert.deepEqual(migrated,original);
 assert.deepEqual(restored.record(id,{slug:'heart',outcome,requestKey:'heart:legacy'}),[]);
 restored.flush();
});

test('sync copies MP4 and WebM media while keeping editable source files excluded',t=>{
 const dir=temporary(t),source=path.join(dir,'source'),target=path.join(dir,'target');
 fs.mkdirSync(source,{recursive:true});
 for(const file of ['opening.mp4','opening.webm','moment.webp','master.psd','master.ai','master.mov'])fs.writeFileSync(path.join(source,file),file);
 const stats={files:0,bytes:0};
 copy(source,target,'assets/media',stats);
 assert.deepEqual(fs.readdirSync(target).sort(),['moment.webp','opening.mp4','opening.webm']);
 assert.equal(stats.files,3);
});

test('deployment manifest requires current Bpedia music and artwork, and includes all Heart audio and videos',()=>{
 const extras=['assets/media/opening.mp4','assets/media/reveal.webm','assets/moments/extra.png','assets/audio/bpedia-jingle-hook.mp3','assets/characters/zoro.webp','js/game.js'];
 const collected=collectHeartReleaseAssets([...expectedAssets,...extras].map(file=>`games/heart/${file}`));
 assert.deepEqual(collected,[...expectedAssets,...extras.slice(0,4)].sort());
 assert.throws(()=>collectHeartReleaseAssets(expectedAssets.filter(file=>file!=='assets/moments/zoro-vow.webp')),/zoro-vow.webp/);
 assert.throws(()=>collectHeartReleaseAssets(expectedAssets.filter(file=>file!=='assets/bipy-variants/bipy-hug.webp')),/bipy-hug.webp/);
 assert.throws(()=>collectHeartReleaseAssets(expectedAssets.filter(file=>file!=='assets/video/grand-line-promo-poster.webp')),/grand-line-promo-poster.webp/);
 assert.throws(()=>collectHeartReleaseAssets(expectedAssets.filter(file=>file!=='assets/audio/bpedia-main-bgm.mp3')),/bpedia-main-bgm.mp3/);
});

test('Heart stylesheet covers the complete trading-card experience',()=>{
 const css=fs.readFileSync(path.join(__dirname,'..','games','heart','css','game.css'),'utf8');
 for(const selector of [
  '.leaders','.leader-slot','.host-card','.deck-body','.booster-button','.fan','.poster-panel',
  '.tcg','.tcg-leader','.tcg-back','.booster','.poster','.parade-track','.binder-grid',
  '.trailer','.play-shell','.play-top','.play-body','.play-stage','.showcase','.play-details'
 ])assert.ok(css.includes(selector),`missing Heart layout selector ${selector}`);
 assert.match(css,/@media\s*\([^)]*max-width\s*:\s*(?:700|760|800)px/i);
 assert.match(css,/@media\s*\(prefers-reduced-motion\s*:\s*reduce\)/i);
});
