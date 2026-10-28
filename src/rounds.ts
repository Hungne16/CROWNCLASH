import { gameRounds, type Game } from './game';

export const canEditRounds = (g: Game) => g.phase === 'setup' && g.history.length === 0 && !(g.playedQuestionIds?.length);
export function removeRound(g: Game, number: number): Game {
  const names = gameRounds(g);
  if (!canEditRounds(g) || names.length <= 1 || number < 1 || number > names.length) return g;
  return {...g, settings:{...g.settings,roundNames:names.filter((_,i)=>i!==number-1)},
    questions:g.questions.filter(q=>q.round!==number).map(q=>({...q,round:q.round>number?q.round-1:q.round})),
    round:1, questionIndex:null, boardSelectedId:null, host:null};
}
