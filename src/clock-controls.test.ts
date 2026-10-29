import {describe,it,expect} from 'vitest';
import pack from './data/group7-chapter8.json';
import {initialGame} from './game';
import {openQuestion,questionTime,toggleClock,setQuestionClock} from './controller';
describe('MC question clock',()=>{
 it('waits for MC, pauses, resumes and resets after expiry',()=>{
  const base=initialGame();
  const ready={...base,questions:pack as typeof base.questions,questionIndex:0,phase:'hint' as const,host:0,hintRead:true};
  const waiting=openQuestion(ready,1000,false);
  expect(waiting.paused).toBe(true);
  expect(questionTime(waiting,61000).elapsed).toBe(0);
  const set=setQuestionClock(waiting,90);
  const running=toggleClock(set,100000);
  expect(questionTime(running,110000).seconds).toBe(80);
  const paused=toggleClock(running,110000);
  expect(questionTime(paused,150000).seconds).toBe(80);
  expect(questionTime(toggleClock(paused,150000),160000).seconds).toBe(70);
  expect(questionTime(setQuestionClock(running,45),999999).seconds).toBe(45);
  expect(setQuestionClock(running,0)).toBe(running);
 });
});
