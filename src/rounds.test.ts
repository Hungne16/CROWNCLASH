import { describe, expect, it } from 'vitest';
import { gameRounds, initialGame } from './game';
import { finishRound, normalizeGame, validateQuestions, createPracticeGame } from './controller';
import { removeRound } from './rounds';
import { fromPreparationGame, preparationGame } from './admin/preparation';
import { testQuestions } from './testQuestions';

describe('custom round structure',()=>{
  const game=()=>({...initialGame(),settings:{...initialGame().settings,roundNames:['Opening','Barriers','Case study','Final']},questions:testQuestions.map((q,i)=>({...q,round:i===4?4:q.round}))});
  it('continues beyond round three and ends at the configured last round',()=>{
    const g={...game(),round:3,phase:'round-summary' as const};
    expect(finishRound(g).round).toBe(4);
    expect(finishRound({...g,round:4}).phase).toBe('finished');
    expect(normalizeGame({...g,round:4}).round).toBe(4);
  });
  it('supports a one-round match',()=>{
    const g={...initialGame(),settings:{...initialGame().settings,roundNames:['Only']}};
    expect(gameRounds(g)).toEqual(['Only']);
    expect(finishRound(g).phase).toBe('finished');
  });
  it('deletes the chosen round, renumbers later questions, and preserves scores/cards',()=>{
    const g=game(), next=removeRound(g,2);
    expect(gameRounds(next)).toEqual(['Opening','Case study','Final']);
    expect(next.questions.some(q=>q.id===testQuestions[3].id)).toBe(false);
    expect(next.questions.find(q=>q.id===testQuestions[4].id)?.round).toBe(3);
    expect(next.teams).toEqual(g.teams);
    expect(removeRound({...g,phase:'question'},2).questions).toEqual(g.questions);
    expect(removeRound({...g,playedQuestionIds:['played']},2).questions).toEqual(g.questions);
  });
  it('retains names and empty rounds through cloud preparation and practice',()=>{
    const g=game();
    expect(gameRounds(preparationGame(fromPreparationGame(g)))).toEqual(gameRounds(g));
    expect(gameRounds(createPracticeGame(g.questions,g.settings))).toEqual(gameRounds(g));
    expect(validateQuestions([{...testQuestions[0],round:4}])[0].round).toBe(4);
    expect(()=>validateQuestions([{...testQuestions[0],round:1.5}])).toThrow();
  });
});
