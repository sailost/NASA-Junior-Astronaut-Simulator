import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Window } from "happy-dom";
import { Simulation } from "../src/game/systems/Simulation";
import { MissionLearning, missionLessonCopy } from "../src/game/ui/MissionLearning";
import { MissionLessonView } from "../src/game/ui/MissionLessonView";
import { Interface } from "../src/game/ui/Interface";
import { TUTORIAL_KEY } from "../src/game/tutorial/TutorialManager";
import { stations } from "../src/game/world/map";
import { operateMachine } from "./support/operateMachine";
let dom:Window;
const nativeFetch=globalThis.fetch;
beforeEach(async()=>{
  dom=new Window({url:'http://localhost:5173/'});Object.assign(globalThis,{window:dom,document:dom.document,localStorage:dom.localStorage});
  dom.matchMedia=(()=>({matches:true})) as any;
  const science=await readFile('public/data/science.json','utf8');globalThis.fetch=(async()=>new Response(science)) as typeof fetch;
});
afterEach(()=>{globalThis.fetch=nativeFetch;void dom.happyDOM.close();});
function fixture(){const sim=new Simulation(2);sim.startCampaign();const journal=new MissionLearning();return{sim,journal};}
test('every objective in all three levels has a specific plain-language explanation and an official source',()=>{
  const {sim}=fixture();
  for(const level of [1,2,3] as const){sim.campaign!.level=level;for(const objective of sim.campaign!.objectives(sim)){
    const lesson=missionLessonCopy[objective.id];assert.ok(lesson,objective.id);
    assert.ok(lesson[0].length>70);assert.ok(lesson[1].length>70);
    assert.match(lesson[2].url,/^https:\/\/(www\.)?(nasa\.gov|science\.nasa\.gov|technology\.nasa\.gov|ccmc\.gsfc\.nasa\.gov|asc-csa\.gc\.ca)\//);
  }}
});
test('successful collection creates one completion lesson, failed and repeated actions do not duplicate it',()=>{
  const {sim,journal}=fixture();journal.observe(sim);assert.equal(journal.take(),undefined);
  sim.collectSample('plant');journal.action('collect-plant',sim);
  const lesson=journal.take()!;assert.equal(lesson.objective,true);assert.match(lesson.why,/muestra/);assert.match(lesson.next,/Laboratorio/);
  sim.collectSample('plant');journal.observe(sim);assert.equal(journal.take(),undefined);
  journal.reset();journal.observe(sim);assert.ok(journal.take());
});
test('only completed missions generate lessons, with no delayed background or partial-action lessons',()=>{
  const {sim,journal}=fixture();sim.collectSample('plant');journal.observe(sim);journal.take();
  sim.loadSample();sim.startAnalysis();journal.observe(sim);assert.equal(journal.take(),undefined);
  sim.tick(8.1);journal.observe(sim);assert.equal(journal.take(),undefined);
  sim.action('campaign-plant-economy');journal.observe(sim);assert.equal(journal.take()!.key,'1:analyze-plant');
  sim.action('plant');journal.action('plant',sim);const lesson=journal.take()!;
  assert.equal(lesson.objective,true);assert.equal(lesson.key,'1:plant-trial');assert.equal(journal.take(),undefined);
  sim.tick(15);journal.observe(sim);assert.equal(journal.take(),undefined);
  sim.campaign!.level=2;journal.observe(sim);assert.equal(journal.take(),undefined,'old evidence must not repeat when the level changes');
});
test('reading requires five visible seconds, supports an interactive explanation and never closes automatically',()=>{
  const {sim,journal}=fixture();sim.collectSample('plant');journal.observe(sim);
  document.body.innerHTML='<section id="lesson"></section>';const root=document.querySelector<HTMLElement>('#lesson')!;
  let time=0,closed=0;const view=new MissionLessonView(root,journal.take()!,()=>closed++,()=>time);
  const button=root.querySelector<HTMLButtonElement>('#lesson-continue')!;
  button.click();assert.equal(closed,0);
  time=4999;view.update();assert.equal(button.disabled,true);view.key(new dom.KeyboardEvent('keydown',{code:'Escape'}) as any);assert.equal(closed,0);
  time=5000;view.update();assert.equal(button.disabled,false);assert.equal(closed,0,'reading never auto dismisses');
  assert.equal(root.querySelector('#lesson-impact'),null);assert.equal(root.querySelector('.lesson-source'),null);
  button.click();button.click();assert.equal(closed,1);view.destroy();
});
test('the card teaches directly, defines the plant sample and contains no source or impact panels',()=>{
  const {sim,journal}=fixture();sim.collectSample('plant');journal.observe(sim);const lesson=journal.take()!;
  document.body.innerHTML='<section id="lesson"></section>';const root=document.querySelector<HTMLElement>('#lesson')!;
  const view=new MissionLessonView(root,lesson,()=>{});
  assert.equal(root.querySelectorAll('.lesson-copy p').length,2);
  assert.match(root.querySelector('.lesson-copy')!.textContent!,/hoja/);assert.match(root.querySelector('.lesson-knowledge')!.textContent!,/fotosíntesis/);
  assert.ok(lesson.next.split(/\s+/).length<=35);
  assert.equal(root.querySelectorAll('details').length,0);
  assert.equal(root.querySelector('#lesson-impact'),null);
  assert.equal(root.textContent!.split(lesson.next).length-1,1);
  assert.equal(root.querySelector('.lesson-next h3')!.textContent,'Ahora vamos a…');
  assert.doesNotMatch(root.textContent!,/\uFFFD|est\?|all\?\?|qu\?/);
  view.destroy();
});
test('laboratory, choice and planting show feedback at the correct action, not on a later simulation tick',async(t)=>{
  localStorage.setItem(TUTORIAL_KEY,'done');document.body.innerHTML='<div id="ui"></div>';
  const root=document.querySelector<HTMLElement>('#ui')!,sim=new Simulation(2);
  const scene:any={player:{x:765,y:350},input:{keyboard:{enabled:true,resetKeys(){},clearCaptures(){},addCapture(){}}},cameras:{main:{fadeIn(){},worldView:{x:0,y:0,width:1540,height:1000}}},setTrackedStation(){}};
  const ui=new Interface(root,sim,scene,{muted:true,tone(){},unlock(){}} as any);
  t.after(()=>{(ui as any).lessonView?.destroy();(ui as any).puzzle?.destroy();});
  const click=(selector:string)=>{const node=root.querySelector<HTMLElement>(selector);assert.ok(node,selector);node.click();};
  const continueReading=()=>{const view=(ui as any).lessonView;view.now=()=>view.previous+6000;view.update();click('#lesson-continue');assert.equal(String(root.dataset.screen),'game');};
  click('#start');click('#intro-skip');scene.onInteract(stations.find((s)=>s.id==='greenhouse'));click('[data-command="collect-plant"]');
  assert.equal(root.dataset.screen,'lesson');continueReading();
  assert.equal(root.querySelector<HTMLElement>('#mission-pressure')!.hidden,true);
  scene.onInteract(stations.find((s)=>s.id==='research'));click('#puzzle-launch');assert.doesNotMatch(root.querySelector('#puzzle-time')!.textContent!,/75 s/);operateMachine(root,'laboratory');
  for(let i=0;i<40&&String(root.dataset.screen)==='puzzle';i++)await new Promise((resolve)=>setTimeout(resolve,50));
  assert.equal(sim.research,1);assert.equal(sim.expedition.processing,undefined);
  assert.equal(root.dataset.screen,'terminal','a completed analysis exposes choices immediately instead of opening a partial mission lesson');
  click('[data-command="campaign-plant-economy"]');assert.equal(root.dataset.screen,'lesson');assert.match(root.querySelector('h2')!.textContent!,/riego/);
  continueReading();scene.onInteract(stations.find((s)=>s.id==='greenhouse'));click('[data-command="plant"]');
  assert.equal(sim.crop,0);assert.equal(root.dataset.screen,'lesson');assert.match(root.querySelector('h2')!.textContent!,/Cultivo plantado/);
  continueReading();sim.tick(30);(ui as any).lastRender=-1000;ui.update();
  assert.equal(root.dataset.screen,'game','no delayed planting lecture');assert.equal(sim.resources.health,100);
});
test('hidden tab time does not count as protected reading',()=>{
  const {sim,journal}=fixture();sim.collectSample('plant');journal.observe(sim);
  document.body.innerHTML='<section id="lesson"></section>';let time=0;
  const view=new MissionLessonView(document.querySelector<HTMLElement>('#lesson')!,journal.take()!,()=>{},()=>time);
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});time=10000;view.update();assert.equal(view.canContinue,false);
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});time=14999;view.update();assert.equal(view.canContinue,false);
  time=15000;view.update();assert.equal(view.canContinue,true);view.destroy();
});
test('collecting through the actual terminal immediately pauses gameplay and the next objective resumes after reading',async()=>{
  localStorage.setItem(TUTORIAL_KEY,'done');document.body.innerHTML='<div id="ui"></div>';
  const root=document.querySelector<HTMLElement>('#ui')!,sim=new Simulation(2);
  const scene:any={player:{x:765,y:350},input:{keyboard:{enabled:true,resetKeys(){},clearCaptures(){},addCapture(){}}},cameras:{main:{fadeIn(){},worldView:{x:0,y:0,width:1540,height:1000}}},setTrackedStation(){}};
  const ui=new Interface(root,sim,scene,{muted:true,tone(){},unlock(){}} as any);
  const click=(selector:string)=>{const node=root.querySelector<HTMLElement>(selector);assert.ok(node,selector);node.click();};
  click('#start');click('#intro-skip');scene.onInteract(stations.find((node)=>node.id==='greenhouse'));click('[data-command="collect-plant"]');
  assert.equal(root.dataset.screen,'lesson');assert.match(root.querySelector('.lesson-complete')!.textContent!,/OBJETIVO COMPLETADO/);
  assert.equal(sim.paused,true);assert.equal(scene.input.keyboard.enabled,false);assert.equal(scene.blocked,true);
  const frozen=JSON.stringify(sim);sim.tick(500);assert.equal(JSON.stringify(sim),frozen);
  document.dispatchEvent(new dom.KeyboardEvent('keydown',{code:'Escape'}) as any);document.dispatchEvent(new dom.KeyboardEvent('keydown',{code:'KeyC'}) as any);
  assert.equal(root.dataset.screen,'lesson');assert.equal(root.querySelector<HTMLButtonElement>('#lesson-continue')!.disabled,true);
  await new Promise((resolve)=>setTimeout(resolve,5150));click('#lesson-continue');
  assert.equal(root.dataset.screen,'game');assert.equal(sim.paused,false);assert.equal(scene.input.keyboard.enabled,true);
  assert.match(root.querySelector('#current-mission-title')!.textContent!,/Estudia/);
  (ui as any).lastRender=-1000;ui.update();assert.equal(root.dataset.screen,'game');
});
