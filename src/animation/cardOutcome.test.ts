import {describe,it,expect} from 'vitest';
import {initialGame} from '../game';
import {activateCard,challengeTeam,openQuestion,scoreAnswer,stealTeam} from '../controller';
const ready=()=>({...initialGame(),teams:initialGame().teams.map(t=>({...t,score:0})),phase:'hint' as const,host:0,questionIndex:0,hintRead:true,questions:[{id:'result',round:1 as const,difficulty:'easy' as const,hint:'hint',text:'question',answer:'private answer'}]});
describe('card outcome animations use committed points',()=>{
 it.each([true,false])('Double reports the actual doubled delta, correct=%s',correct=>{const g=openQuestion(activateCard(ready(),'double'),1000);expect(g.cardOutcome).toBeUndefined();const scored=scoreAnswer(g,correct,2000);expect(scored.cardOutcome?.card).toBe('double');expect(scored.cardOutcome?.result?.delta).toBe(correct?20:-20);expect(scored.cardOutcome?.result?.total).toBe(scored.teams[0].score);expect(JSON.stringify(scored.cardOutcome)).not.toContain('private answer');});
 it('Safe wrong shows protection and 0 rather than claiming a gain',()=>{const g=scoreAnswer(openQuestion(activateCard(ready(),'safe'),1000),false,2000);expect(g.cardOutcome?.result).toMatchObject({delta:0,total:0,correct:false});});
 it('Challenge attributes points to the responding team, not the challenger',()=>{const g=challengeTeam(openQuestion(activateCard(ready(),'double'),1000),2,2000);const scored=scoreAnswer(g,true,3000);expect(scored.cardOutcome).toMatchObject({card:'challenge',team:2,teamName:'Đội 3',result:{delta:10,total:10,sourceName:'Đội 1'}});expect(scored.teams[0].score).toBe(0);});
 it('Steal wrong uses the actual penalty and is not announced as victory',()=>{const g=stealTeam({...ready(),phase:'steal-window',stealDeadline:4000},1,2000);const scored=scoreAnswer(g,false,3000);expect(scored.cardOutcome).toMatchObject({card:'steal',team:1,result:{delta:-10,correct:false}});expect(scoreAnswer(scored,false,3100).cardOutcome?.id).toBe(scored.cardOutcome?.id);});
 it('normal answers do not generate a card GIF',()=>{expect(scoreAnswer(openQuestion(ready(),1000),true,2000).cardOutcome).toBeUndefined();});
});
