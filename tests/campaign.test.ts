import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Window } from "happy-dom";
import { Simulation } from "../src/game/systems/Simulation";
import { getObjectives, recommendObjective } from "../src/game/systems/objectives";
import { findRoute } from "../src/game/world/navigation";
import { stations } from "../src/game/world/map";
import { campaignStory, pendingStoryArt } from "../src/game/ui/CampaignStory";
import { Prologue } from "../src/game/ui/Prologue";
import { Interface } from "../src/game/ui/Interface";
import { TUTORIAL_KEY } from "../src/game/tutorial/TutorialManager";
import { renderMachineTerminal } from "../src/game/ui/MachineTerminal";
import { auraDialogue } from "../src/game/ui/AuraDialogue";
let dom: Window;
const nativeFetch = globalThis.fetch;
beforeEach(async () => {
  dom = new Window({url:'http://localhost:5173/repo/'});
  Object.assign(globalThis, {window:dom,document:dom.document,localStorage:dom.localStorage});
  dom.matchMedia = (() => ({matches:true})) as any;
  const data = await readFile('public/data/science.json','utf8');
  globalThis.fetch = (async () => new Response(data)) as typeof fetch;
});
afterEach(() => {globalThis.fetch=nativeFetch;void dom.happyDOM.close();});
const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve,ms));
function start(seed=2) {const s=new Simulation(seed);s.startCampaign();return s;}
function actor() {return {x:765,y:350};}
function walk(s:Simulation,p:{x:number;y:number},id:string) {
  const station=stations.find((node)=>node.id===id)!;
  const route=findRoute(p,station);
  assert.ok(route.length>0);
  for(const point of route) {s.tick(Math.hypot(point.x-p.x,point.y-p.y)/155);p.x=point.x;p.y=point.y;}
  assert.equal(s.status,'playing',s.reason);
}
function analyze(s:Simulation) {assert.equal(s.loadSample(),true);assert.match(s.startAnalysis(),/Prueba terminada/);assert.equal(s.expedition.processing,undefined);}
function day(s:Simulation,p=actor(),plan='economy') {
  walk(s,p,'greenhouse');s.collectSample('plant');walk(s,p,'research');analyze(s);
  assert.match(s.action(`campaign-plant-${plan}`),/Cultivo/);
  walk(s,p,'greenhouse');s.action('plant');walk(s,p,'power');
  s.action('battery-reserve');s.tick(.25);
  for(let i=0;i<30&&!s.campaign!.pending;i++)s.tick(1);
  assert.equal(s.campaign!.pending,'sol2');return p;
}
function next(s:Simulation) {
  const frozen=JSON.stringify(s);s.tick(1000);assert.equal(JSON.stringify(s),frozen);
  const resources={...s.resources}, decisions=[...s.campaign!.decisions];
  assert.equal(s.campaign!.advance(s),true);s.paused=false;
  assert.deepEqual(s.resources,resources);assert.deepEqual(s.campaign!.decisions,decisions);
}
function night(s:Simulation,p:{x:number;y:number},plan='reserve') {
  const risk=s.campaign!.nightRisk;
  walk(s,p,risk);if(s.campaign!.elapsed<12)s.tick(12-s.campaign!.elapsed+.25);
  assert.equal(s.systems[risk],false);
  assert.match(s.action(`campaign-inspect-${risk}`),/confirmado/);assert.equal(s.repair(risk),true);s.tick(.25);
  assert.equal(s.campaign!.solarStarted,true);
  walk(s,p,'shelter');s.action('shelter');s.tick(.25);
  walk(s,p,'water');s.collectSample('water');walk(s,p,'research');analyze(s);s.action(`campaign-water-${plan}`);
  for(let i=0;i<100&&!s.campaign!.pending&&s.status==='playing';i++)s.tick(1);
  assert.equal(s.status,'playing',s.reason);assert.equal(s.campaign!.pending,'sol3');
}
function dawn(s:Simulation,p:{x:number;y:number},partial=false) {
  walk(s,p,'research');
  if(!partial) {
    analyze(s);s.action(s.resources.energy < 25 ? 'campaign-soil-condition' : 'campaign-soil-isolate');
    walk(s,p,'greenhouse');if(s.crop>=100){s.action('harvest');s.action('plant');}s.tick(8.1);
    s.action('campaign-verify');
    assert.equal(s.campaign!.verifiedTrial,true);
  } else s.action('campaign-partial');
  walk(s,p,'comms');assert.match(s.action('transmit'),/Transmisión/);s.tick(28.1);
}
test('three real stages finish with travel, decisions and evidence, preserving reserves across comics without resource injections',()=>{
  for(const plan of ['economy','growth']) {
    const s=start(),p=day(s,actor(),plan);const first={...s.campaign!.checkpoints[0].resources};next(s);
    assert.equal(s.daylight,false);assert.equal(s.sol,2);night(s,p);next(s);
    assert.equal(s.daylight,true);assert.equal(s.phase,.04);assert.equal(s.sol,3);dawn(s,p);
    assert.equal(s.status,'won',s.reason);assert.ok(s.time<540,'completion does not wait for the old nine-minute deadline');
    assert.equal(s.campaign!.evidence.length,3);assert.equal(s.campaign!.decisions.length,3);
    assert.deepEqual(s.campaign!.checkpoints[0].resources,first);
    assert.notEqual(s.campaign!.checkpoints[0].resources,s.resources);
  }
});
test('waiting cannot complete level one, healthy repairs spend nothing, and choices have different actual effects',()=>{
  const idle=start();idle.tick(30);assert.equal(idle.campaign!.pending,undefined);assert.equal(idle.sol,1);
  const before={...idle.resources};const parts=idle.spareParts;assert.equal(idle.repair('oxygen'),false);assert.deepEqual(idle.resources,before);assert.equal(idle.spareParts,parts);
  const a=start(),b=start();
  for(const s of [a,b]){s.collectSample('plant');analyze(s);}
  a.action('campaign-plant-economy');b.action('campaign-plant-growth');a.action('plant');b.action('plant');a.tick(10);b.tick(10);
  assert.ok(a.resources.water>b.resources.water);assert.ok(a.crop<b.crop);
  assert.match(a.campaign!.evidence[0].interpretation,/inventados/);
  const message=auraDialogue('evidence',{sim:a});assert.equal(message.references?.length,1);assert.match(message.text,/ahorro de agua/);
});
test('partial and early failure outcomes are evaluated from real state rather than reaching a day number',()=>{
  const s=start(),p=day(s);next(s);night(s,p);next(s);dawn(s,p,true);
  assert.equal(s.status,'partial');assert.equal(s.research,2);assert.equal(s.report,'received');
  const failed=start();failed.tick(1000);assert.equal(failed.status,'lost');assert.equal(failed.sol,1);
  const story=campaignStory(failed.campaign!.outcome(failed),failed);
  assert.equal(story.id,'defeat');assert.ok(story.pages[0].lines!.includes(failed.reason));assert.match(story.pages[1].lines![0],/No consta/);
});
test('diagnosis and transitions cannot be duplicated or activated without prerequisites',()=>{
  const s=start();assert.equal(s.campaign!.advance(s),false);assert.match(s.action('campaign-water-reserve'),/Primero debes recoger/);
  const p=day(s);next(s);const before={...s.resources};
  const wrong=s.campaign!.nightRisk==='water'?'oxygen':'water';s.action(`campaign-inspect-${wrong}`);
  assert.equal(s.campaign!.diagnosed,false);assert.deepEqual(s.resources,before);
  night(s,p);assert.equal(s.campaign!.checkpoints.length,2);next(s);assert.equal(s.campaign!.advance(s),false);
  assert.equal(s.campaign!.decisions.length,2);assert.equal(s.report,'none');
});
test('story text reflects damage, reserves and incomplete science, while pending illustration paths are never requested',()=>{
  const s=start();s.systems.water=false;s.resources.health=40;
  const scene=campaignStory('sol3',s);assert.match(scene.pages[0].lines!.join(' '),/reciclador/);
  const paths=Object.values(pendingStoryArt).flat();
  for(const id of ['sol2','sol3','victory','partial','defeat'] as const) {
    const sequence=campaignStory(id,s);assert.equal(sequence.pages.length,2);
    for(const page of sequence.pages){assert.ok(page.asset);assert.equal(page.image,undefined);assert.ok(!paths.includes(page.asset as any));}
  }
  const terminal=renderMachineTerminal(stations.find((node)=>node.id==='oxygen')!,s);
  assert.match(terminal,/Primero debes recoger la muestra vegetal/);
});
function uiGame(lessons=false){
  localStorage.setItem(TUTORIAL_KEY,'done');document.body.innerHTML='<div id="ui"></div>';
  const root=document.querySelector<HTMLElement>('#ui')!,s=new Simulation(2),p=actor();
  const scene:any={player:p,input:{keyboard:{enabled:true,resetKeys(){},clearCaptures(){},addCapture(){}}},cameras:{main:{fadeIn(){},worldView:{x:0,y:0,width:1540,height:1000}}},setTrackedStation(){},reset(next:Simulation){this.sim=next;}};
  const ui=new Interface(root,s,scene,{muted:true,tone(){},unlock(){}} as any,{lessons});
  const click=(selector:string)=>{const node=root.querySelector<HTMLElement>(selector);assert.ok(node,selector);node.click();};
  const refresh=()=>{(ui as any).lastRender=-1000;ui.update();};click('#start');click('#intro-skip');refresh();
  return{root,s,p,ui,scene,click,refresh};
}
test('production UI launches each interlude once, skip preserves its requirements and ending precedes the results screen',()=>{
  const {root,s,p,ui,scene,click,refresh}=uiGame();assert.ok(s.campaign);day(s,p);refresh();
  assert.equal(root.dataset.screen,'story');assert.equal(scene.blocked,true);assert.equal(scene.input.keyboard.enabled,false);
  const frozen=JSON.stringify(s);s.tick(1000);refresh();assert.equal(JSON.stringify(s),frozen);
  click('#intro-skip');assert.equal(root.dataset.screen,'game');assert.equal(s.campaign!.level,2);assert.equal(scene.input.keyboard.enabled,true);
  refresh();assert.equal(root.dataset.screen,'game');night(s,p);refresh();click('#intro-skip');assert.equal(s.campaign!.level,3);
  dawn(s,p);refresh();assert.equal(root.dataset.screen,'story');assert.equal(root.querySelector('.end-stats'),null);
  click('#intro-skip');assert.equal(root.dataset.screen,'end');assert.match(root.querySelector('h2')!.textContent!,/Misión completada/);
  assert.equal(ui.sim,s);assert.equal(root.querySelectorAll('.campaign-evidence').length,3);
  click('#restart');assert.equal(ui.sim.campaign!.level,1);assert.equal(ui.sim.campaign!.evidence.length,0);
});
test('provisional pages use the same curved-paper engine, support reverse and clean up resources',async()=>{
  document.body.innerHTML='<section id="reader"></section>';const root=document.querySelector<HTMLElement>('#reader')!,s=start();let finished=0;
  const view=new Prologue(root,{start(){finished++;},menu(){}},campaignStory('sol2',s));
  for(const img of Array.from(root.querySelectorAll<HTMLImageElement>('.intro-preload img')))img.dispatchEvent(new dom.Event('load') as any);
  await wait();assert.match(root.querySelector('.intro-story-content')!.textContent!,/Las decisiones de hoy/);
  assert.equal(root.querySelectorAll('.intro-preload img').length,2);
  dom.matchMedia=(()=>({matches:false})) as any;
  view.turn(1);assert.equal(root.querySelectorAll('.intro-strip').length,28);assert.ok(root.querySelector('.intro-paper-front .comic-narrative'));
  window.dispatchEvent(new dom.Event('resize') as any);assert.equal(root.querySelector('#intro-counter')!.textContent,'2 / 2');
  view.turn(-1);window.dispatchEvent(new dom.Event('resize') as any);assert.equal(root.querySelector('#intro-counter')!.textContent,'1 / 2');
  view.destroy();assert.equal(finished,0);assert.equal(root.childElementCount,0);
});
test('a mature crop cannot validate an intervention until a new trial actually grows',()=>{
  const s=start(),p=day(s);next(s);night(s,p);next(s);for(let i=0;i<180&&s.crop<100;i++)s.tick(1);
  assert.equal(s.crop,100);analyze(s);s.action('campaign-soil-condition');s.tick(9);
  assert.equal(s.campaign!.verifiedTrial,false);
  s.action('harvest');s.action('plant');s.tick(8.1);assert.equal(s.campaign!.verifiedTrial,false);s.action('campaign-verify');assert.equal(s.campaign!.verifiedTrial,true);
});
test('evidence choices are real terminal controls and cannot be applied twice',()=>{
  const {root,s,scene,click}=uiGame();s.collectSample('plant');analyze(s);
  scene.onInteract(stations.find((node)=>node.id==='research'));
  assert.equal(root.querySelectorAll('.campaign-evidence').length,1);
  assert.match(s.campaign!.evidence[0].source.url,/asc-csa/);
  click('[data-command="campaign-plant-economy"]');assert.equal(s.campaign!.plantPlan,'economy');
  assert.equal(root.querySelector('[data-command="campaign-plant-growth"]'),null);
  assert.match(s.action('campaign-plant-growth'),/Primero debes plantar/);
  assert.equal(s.campaign!.plantPlan,'economy');
});

test('the objective arrow persists on arrival and throughout the grouped mission, then points to the next mission',()=>{
  const {root,s,p,scene,click,refresh}=uiGame();
  let tracked:string|undefined;scene.setTrackedStation=(id?:string)=>{tracked=id;};
  const edge=root.querySelector<HTMLElement>('#objective-direction')!;
  for(const [width,height] of [[1140,641],[1139,640]]) {
    scene.cameras.main.worldView={x:400,y:0,width,height};refresh();
    assert.equal(edge.hidden,false);assert.equal(tracked,'greenhouse');
    p.x=1245;p.y=310;scene.nearest=stations.find((st)=>st.id==='greenhouse');refresh();
    assert.equal(edge.hidden,false);assert.equal(tracked,'greenhouse','arrival must not complete the mission');
    click('#mission-btn');click('[data-track="batteries"]');
    assert.equal(tracked,'greenhouse','future mission selection must not abandon the active objective');
    click('#close-mission');
  }
  s.collectSample('plant');refresh();
  assert.equal(edge.hidden,false);assert.equal(tracked,'research');
  assert.match(root.querySelector('#current-mission-title')!.textContent!,/Estudia la hoja/);
  analyze(s);refresh();assert.equal(edge.hidden,false);assert.equal(tracked,'research','keep guiding until the irrigation choice completes the objective');
  s.action('campaign-plant-economy');refresh();assert.equal(edge.hidden,false);assert.equal(tracked,'greenhouse');
  s.action('plant');refresh();assert.equal(edge.hidden,false);assert.equal(tracked,'power');
});
test('early defeat shows its ending without waiting for the third level',()=>{
  const {root,s,click,refresh}=uiGame();s.tick(1000);refresh();
  assert.equal(s.sol,1);assert.equal(root.dataset.screen,'story');click('#intro-skip');
  assert.equal(root.dataset.screen,'end');assert.match(root.querySelector('h2')!.textContent!,/interrumpida/);
});
test('a partial report opens the partial ending and labels the result correctly',()=>{
  const {root,s,p,click,refresh}=uiGame();day(s,p);refresh();click('#intro-skip');
  night(s,p);refresh();click('#intro-skip');dawn(s,p,true);refresh();
  assert.equal(root.dataset.screen,'story');click('#intro-skip');
  assert.equal(root.querySelector('h2')!.textContent,'Éxito parcial');
  assert.equal(root.querySelectorAll('.campaign-evidence').length,2);
});
test('level one enforces each prerequisite in the simulator and disables future terminal actions',()=>{
  const s=start();const before=JSON.stringify(s);
  for(const action of ['plant','battery-reserve','upgrade','tend','shelter','transmit','campaign-plant-growth']) assert.match(s.action(action),/Primero debes recoger/);
  assert.match(s.collectSample('water'),/Primero debes recoger/);
  assert.equal(s.loadSample(),false);assert.equal(JSON.stringify(s),before);
  assert.equal(recommendObjective(getObjectives(s))!.id,'collect-plant');
  const greenhouse=document.createElement('div');greenhouse.innerHTML=renderMachineTerminal(stations.find((n)=>n.id==='greenhouse')!,s);
  assert.equal(greenhouse.querySelector<HTMLButtonElement>('[data-command="plant"]')!.disabled,true);
  assert.equal(greenhouse.querySelector<HTMLButtonElement>('[data-command="collect-plant"]')!.disabled,false);
  s.collectSample('plant');assert.equal(recommendObjective(getObjectives(s))!.id,'analyze-plant');
  assert.match(s.action('plant'),/completar el análisis/);assert.equal(s.loadSample(),true);s.startAnalysis();
  assert.match(s.action('battery-reserve'),/elegir la estrategia/);
  assert.equal(recommendObjective(getObjectives(s))!.id,'analyze-plant','processing cannot advance the mission guide');
  s.tick(8.1);assert.equal(recommendObjective(getObjectives(s))!.id,'analyze-plant');
  assert.match(s.action('plant'),/elegir la estrategia/);s.action('campaign-plant-economy');
  assert.match(s.action('battery-reserve'),/plantar/);s.action('plant');
  assert.equal(recommendObjective(getObjectives(s))!.id,'batteries');
  s.action('battery-reserve');assert.equal(s.expedition.batteriesReady,true);s.tick(.25);assert.equal(s.campaign!.pending,'sol2');
});
