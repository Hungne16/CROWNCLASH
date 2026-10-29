import {describe,it,expect} from 'vitest';
import {initialGame,type Game} from './game';
import {nextQuestion,selectHost,hasHostedRound,assignHost,finishRound,prepareHint} from './controller';
const result=():Game=>({...initialGame(),settings:{...initialGame().settings,hostMode:"manual"},questions:Array.from({length:6},(_,i)=>({id:'q'+i,round:1,difficulty:'easy',hint:'Hint',text:'Question',answer:'Answer'})),phase:'result',host:0,answering:1,questionIndex:0});
describe('one host selection per round',()=>{
 it('records original host, preserving the Steal or Challenge responder own turn',()=>{
  const next=nextQuestion(result());expect(hasHostedRound(next,0)).toBe(true);expect(hasHostedRound(next,1)).toBe(false);
  expect(selectHost(next,0)).toBe(next);expect(selectHost(next,1).host).toBe(1);
  const bypass={...next,host:0,boardSelectedId:'q1',rulesConfirmed:true};expect(prepareHint(bypass)).toBe(bypass);
 });
 it('automatically chooses only teams with an unused turn',()=>{
  const next=nextQuestion(result());for(const mode of ['rotate','random'] as const){const g=assignHost({...next,settings:{...next.settings,hostMode:mode}});expect(g.host).not.toBe(0);}
 });
 it('ends after four hosts even with spare questions, and unlocks next round',()=>{
  const g=result();g.hostTurns=[1,2,3].map(team=>({round:1,team,questionId:'prior'+team}));
  const summary=nextQuestion(g);expect(summary.phase).toBe('round-summary');
  const round2=finishRound(summary);expect(round2.round).toBe(2);expect(hasHostedRound(round2,0)).toBe(false);expect(selectHost(round2,0).host).toBe(0);
 });
});
