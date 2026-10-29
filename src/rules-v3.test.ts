import {describe,it,expect} from 'vitest';
import {initialGame} from './game';
import {assignHost,selectHost,normalizeGame} from './controller';
describe('updated document rules',()=>{
 it('starts all four teams at ten points',()=>{expect(initialGame().teams.map(t=>t.score)).toEqual([10,10,10,10]);});
 it('draws a permutation once per round and preserves it while advancing',()=>{
  const drawn=assignHost(initialGame()),order=drawn.drawOrders![1];expect([...order].sort()).toEqual([0,1,2,3]);
  expect(assignHost(drawn).drawOrders![1]).toEqual(order);
  expect(selectHost(drawn,order[1]).host).toBe(order[0]);
  const next=assignHost({...drawn,hostTurns:[{round:1,team:order[0],questionId:'first'}]});expect(next.host).toBe(order[1]);expect(next.drawOrders![1]).toEqual(order);
  const round2=assignHost({...next,round:2});expect(round2.drawOrders![1]).toEqual(order);expect([...round2.drawOrders![2]].sort()).toEqual([0,1,2,3]);
 });
 it('migrates untouched older games but preserves an ongoing score',()=>{
  const old={...initialGame(),rulesVersion:undefined,teams:initialGame().teams.map(t=>({...t,score:0}))};expect(normalizeGame(old).teams.map(t=>t.score)).toEqual([10,10,10,10]);
  const live={...old,history:[{label:'played',delta:[-10,0,0,0],time:1}]};expect(normalizeGame(live).teams[0].score).toBe(0);
 });
});
