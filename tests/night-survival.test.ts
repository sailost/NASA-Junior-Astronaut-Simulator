import { test } from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/systems/Simulation";
import { NightThreats } from "../src/game/world/NightThreats";
import { MissionLearning } from "../src/game/ui/MissionLearning";
import { NightPursuit } from "../src/game/world/NightPursuit";
import { canWalk, stations } from "../src/game/world/map";
import { recommendObjective } from "../src/game/systems/objectives";
function night() {
  const s=new Simulation(2);s.startCampaign();s.campaign!.pending='sol2';s.campaign!.advance(s);s.paused=false;return s;
}
test('campaign has only four coherent day missions, three night missions and three dawn missions',()=>{
  const s=new Simulation(2);s.startCampaign();assert.equal(s.campaign!.objectives(s).length,4);
  s.collectSample('plant');const next=s.campaign!.objectives(s).find((o)=>!o.done)!;
  assert.match(next.instruction,/Laboratorio/);assert.match(next.instruction,/dos formas de regar/);
  const journal=new MissionLearning();journal.observe(s);assert.match(journal.take()!.next,/escáner permite/);
  s.campaign!.level=2;assert.equal(s.campaign!.objectives(s).length,3);
  s.campaign!.level=3;assert.equal(s.campaign!.objectives(s).length,3);
});
test('twenty simulation seconds are granted for every new mission, and explanations freeze the deadline and health',()=>{
  const s=night();s.tick(20);assert.equal(s.campaign!.missionRemaining,0);assert.equal(s.resources.health,100);
  s.tick(1);assert.ok(s.resources.health<100);const before=s.resources.health;
  s.paused=true;s.tick(100);assert.equal(s.resources.health,before);assert.equal(s.campaign!.missionRemaining,0);
  s.paused=false;s.action(`campaign-inspect-${s.campaign!.nightRisk}`);s.repair(s.campaign!.nightRisk);s.tick(.25);assert.equal(s.campaign!.missionRemaining,20);
});
test('day and dawn never run mission deadlines or apply overdue damage',()=>{
  for(const level of [1,3] as const) {
    const s=new Simulation(2);s.startCampaign();s.campaign!.level=level;s.tick(90);
    assert.equal(s.campaign!.missionOverdue,false);assert.equal(s.campaign!.timedMission,'');assert.equal(s.resources.health,100);
  }
});
test('each completed survival mission removes its alien immediately before a lesson, and dawn requires all missions',()=>{
  const s=night(),c=s.campaign!;assert.equal(c.nightMissions(s).length,3);
  s.action(`campaign-inspect-${c.nightRisk}`);assert.equal(s.repair(c.nightRisk),true);
  assert.equal(c.nightMissions(s).length,2,'repair removes the alien before the following simulation step');
  s.tick(.25);assert.equal(c.solarStarted,true);
  s.action('shelter');assert.equal(c.nightMissions(s).length,1,'protection removes its alien before the explanation');
  s.tick(.25);assert.equal(c.pending,undefined,'the water task is still required');
  // Establish the pre-existing plant protocol for this isolated level-two fixture.
  s.expedition.results.push('plant');s.research=1;
  s.collectSample('water');assert.equal(s.loadSample(),true);s.startAnalysis();s.tick(8.1);
  s.action('campaign-water-reserve');assert.equal(c.nightMissions(s).length,0);
  s.tick(.25);assert.equal(c.pending,'sol3');assert.equal(c.advance(s),true);assert.equal(s.daylight,true);
});
test('overdue night damage scales with the number of unresolved missions',()=>{
  const many=night(),few=night();
  few.action(`campaign-inspect-${few.campaign!.nightRisk}`);few.repair(few.campaign!.nightRisk);few.tick(.25);
  many.tick(22);few.tick(22);
  assert.ok(many.resources.health<few.resources.health);
  assert.equal(many.campaign!.nightMissions(many).length,3);assert.equal(few.campaign!.nightMissions(few).length,2);
});
test('Phaser adversaries disappear as their linked mission completes and never remain after dawn',()=>{
  const nodes:any[]=[];
  const ink=new Proxy({}, {get:()=>()=>{}});
  const scene:any={add:{graphics:()=>ink,container:()=>{
    const node:any={visible:false,setDepth(){return this;},setVisible(value:boolean){this.visible=value;return this;},setPosition(){return this;},setScale(){return this;}};nodes.push(node);return node;
  }}};
  const visuals=new NightThreats(scene),s=night();visuals.update(0,s);assert.equal(nodes.filter((n)=>n.visible).length,3);
  s.action(`campaign-inspect-${s.campaign!.nightRisk}`);s.repair(s.campaign!.nightRisk);visuals.update(0,s);assert.equal(nodes.filter((n)=>n.visible).length,2);
  s.campaign!.level=3;visuals.update(0,s);assert.equal(nodes.filter((n)=>n.visible).length,0);
});

test('pursuers reach the astronaut through walkable corridors from every night objective',()=>{
  const player={x:765,y:350};
  for(const id of ['oxygen','water','power','research','shelter']) {
    const pursuit=new NightPursuit(stations.find((s)=>s.id===id)!);
    assert.ok(canWalk(pursuit.x,pursuit.y),`safe spawn at ${id}`);
    let arrived=false;
    for(let frame=0;frame<400;frame++) {
      pursuit.update(.1,player,110);
      assert.ok(canWalk(pursuit.x,pursuit.y),`${id}: no walls or equipment crossed`);
      if(pursuit.touches(player)){arrived=true;break;}
    }
    assert.ok(arrived,`${id}: reaches attack range`);
  }
});

test('pursuers replan when the astronaut changes rooms, without teleporting',()=>{
  const pursuit=new NightPursuit(stations.find((s)=>s.id==='oxygen')!);
  for(let i=0;i<150;i++)pursuit.update(.1,{x:765,y:350},110);
  assert.ok(pursuit.touches({x:765,y:350}));
  const player={x:1245,y:800};let arrived=false;
  for(let i=0;i<250;i++) {
    const previous={x:pursuit.x,y:pursuit.y};pursuit.update(.1,player,110);
    assert.ok(Math.hypot(pursuit.x-previous.x,pursuit.y-previous.y)<=11.001);
    assert.ok(canWalk(pursuit.x,pursuit.y));
    if(pursuit.touches(player)){arrived=true;break;}
  }
  assert.ok(arrived);
});

test('contact attacks cause real health loss before the deadline, scale with attackers, and can cause defeat',()=>{
  const single=night(),many=night();
  const initial=single.resources.health;
  single.applyNightAttack(1,2);many.applyNightAttack(3,2);
  assert.ok(single.campaign!.missionRemaining>0);assert.ok(single.resources.health<initial);
  assert.ok(many.resources.health<single.resources.health);
  single.resources.health=.2;single.applyNightAttack(1,1);
  assert.equal(single.resources.health,0);assert.equal(single.status,'lost');assert.match(single.reason,/marcianitos/);
});

test('contact damage is frame-rate independent, freezes in lessons, and is disabled outside unresolved night missions',()=>{
  const a=night(),b=night();
  for(let i=0;i<100;i++)a.applyNightAttack(2,.1);
  for(let i=0;i<200;i++)b.applyNightAttack(2,.05);
  assert.ok(Math.abs(a.resources.health-b.resources.health)<.000001);
  const before=a.resources.health;
  a.paused=true;assert.equal(a.applyNightAttack(3,10),0);assert.equal(a.resources.health,before);
  a.paused=false;a.campaign!.pending='sol3';assert.equal(a.applyNightAttack(3,10),0);
  a.campaign!.pending=undefined;
  for(const level of [1,3] as const){a.campaign!.level=level;assert.equal(a.applyNightAttack(3,10),0);assert.equal(a.resources.health,before);}
});

test('the real Phaser threat update pursues, attacks, freezes behind dialogs, and removes only the completed threat',()=>{
  const nodes:any[]=[];const ink=new Proxy({}, {get:()=>()=>{}});
  const scene:any={add:{graphics:()=>ink,container:()=>{
    const node:any={x:0,y:0,visible:false,setDepth(){return this;},setVisible(value:boolean){this.visible=value;return this;},setPosition(x:number,y:number){this.x=x;this.y=y;return this;},setScale(){return this;}};nodes.push(node);return node;
  }}};
  const visuals=new NightThreats(scene),s=night(),player={x:765,y:350};
  visuals.update(0,s,player,0);
  const spawn={x:nodes[0].x,y:nodes[0].y};
  for(let i=1;i<=150;i++){s.tick(.1);visuals.update(i*100,s,player,.1);}
  assert.notEqual(nodes[0].x,spawn.x);assert.ok(s.resources.health<100);assert.ok(!s.campaign!.missionOverdue);
  const before=s.resources.health,x=nodes[0].x;
  s.paused=true;visuals.update(15000,s,{x:1100,y:350},5);assert.equal(s.resources.health,before);assert.equal(nodes[0].x,x);
  s.paused=false;visuals.update(15000,s,{x:1100,y:350},5,false);assert.equal(s.resources.health,before);assert.equal(nodes[0].x,x);
  s.action(`campaign-inspect-${s.campaign!.nightRisk}`);s.repair(s.campaign!.nightRisk);
  visuals.update(15000,s,player,0);assert.equal(nodes[0].visible,false);assert.equal(nodes.filter((n)=>n.visible).length,2);
  s.campaign!.level=3;visuals.update(15000,s,player,1);assert.equal(nodes.filter((n)=>n.visible).length,0);assert.equal(s.resources.health,before);
});

test('water and soil guidance stays actionable before analysis, including each destination of the grouped water mission',()=>{
  const s=night(),c=s.campaign!;
  s.action(`campaign-inspect-${c.nightRisk}`);s.repair(c.nightRisk);s.tick(.1);
  let current=recommendObjective(c.objectives(s))!;
  assert.equal(current.id,'water-plan');assert.equal(current.stationId,'water');assert.equal(current.waiting,false);
  s.collectSample('water');current=recommendObjective(c.objectives(s))!;
  assert.equal(current.id,'water-plan');assert.equal(current.stationId,'research');assert.equal(current.waiting,false);
  c.level=3;current=recommendObjective(c.objectives(s))!;
  assert.equal(current.id,'soil-plan');assert.equal(current.stationId,'research');assert.equal(current.waiting,false);
});
