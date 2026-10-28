import { describe, expect, it } from 'vitest';
import pack from './data/group7-chapter8.json';
import { initialGame, questionSeconds } from './game';
import { openQuestion, questionTime, toggleClock, validateQuestions } from './controller';

describe('Chapter 8 imported question bank', () => {
  const questions = validateQuestions(pack);
  it('keeps four questions per round and both matching tables', () => {
    expect([1,2,3].map(r => questions.filter(q => q.round === r).length)).toEqual([4,4,4]);
    expect(questions[6].text).toContain('E. Fear of ridicule');
    expect(questions[11].text).toContain('D. He chose the safest option');
    expect(questions[7].text).toContain('Bonus questions:');
    expect(questions[9].answer).toContain('Suggested marking guide');
  });
  it('preserves document timings through validation and pause/resume', () => {
    expect(questions.slice(0,8).map(questionSeconds)).toEqual([15,30,60,30,15,30,60,120]);
    const game = openQuestion({...initialGame(), questions, questionIndex:7, host:0, phase:'hint', hintRead:true},1000);
    expect(questionTime(game,11000).seconds).toBe(110);
    const paused = toggleClock(game,11000);
    expect(questionTime(paused,31000).seconds).toBe(110);
    expect(questionTime(toggleClock(paused,31000),41000).seconds).toBe(100);
  });
  it('rejects invalid custom durations and retains defaults when absent', () => {
    expect(() => validateQuestions([{...pack[0],seconds:-1}])).toThrow();
    expect(() => validateQuestions([{...pack[0],seconds:15.5}])).toThrow();
    expect(questions.slice(8).map(questionSeconds)).toEqual([30,45,45,60]);
  });
});
