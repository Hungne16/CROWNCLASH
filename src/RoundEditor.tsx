import { gameRounds, type Game } from './game';
import { canEditRounds, removeRound } from './rounds';

export function RoundEditor({game,commit,onSelect}:{game:Game;commit:(fn:(g:Game)=>Game)=>void;onSelect:(round:number)=>void}) {
  const names=gameRounds(game), locked=!canEditRounds(game);
  return <section className="roundEditor" aria-label="Round Structure">
    <div className="buttonRow"><h2>Round Structure</h2><button className="btn secondary" disabled={locked || names.length>=100} onClick={()=>{commit(g=>canEditRounds(g)?{...g,settings:{...g.settings,roundNames:[...gameRounds(g),`Round ${gameRounds(g).length+1}`]}}:g);onSelect(names.length+1);}}>+ Add Round</button></div>
    {locked && <p>Finish the match and start a new one to edit the rounds.</p>}
    <div className="roundEditorList">{names.map((name,i)=><div className="roundEditorRow" key={`${i}-${name}`}>
      <b>{i+1}</b><input aria-label={`Round Name ${i+1}`} maxLength={80} disabled={locked} defaultValue={name} onBlur={e=>{const value=e.target.value.trim()||`Round ${i+1}`;e.target.value=value;commit(g=>canEditRounds(g)?{...g,settings:{...g.settings,roundNames:gameRounds(g).map((n,j)=>j===i?value:n)}}:g);}}/>
      <button className="btn secondary" onClick={()=>onSelect(i+1)}>{game.questions.filter(q=>q.round===i+1).length} questions · Edit</button>
      <button className="btn secondary dangerText" aria-label={`Delete Round ${i+1}`} disabled={locked||names.length===1} onClick={()=>{if(!window.confirm(`Delete Round ${i+1} and its ${game.questions.filter(q=>q.round===i+1).length} questions? Later rounds will be renumbered.`))return;commit(g=>removeRound(g,i+1));onSelect(1);}}>Delete</button>
    </div>)}</div>
    <p>Add or delete questions to adjust a round. Use Edit Question to move a question to another round.</p>
  </section>;
}
