import { gameRounds, type Game } from './game';
import { canEditRounds, removeRound } from './rounds';

export function RoundEditor({game,commit,onSelect}:{game:Game;commit:(fn:(g:Game)=>Game)=>void;onSelect:(round:number)=>void}) {
  const names=gameRounds(game), locked=!canEditRounds(game);
  return <section className="roundEditor" aria-label="Cấu trúc vòng thi">
    <div className="buttonRow"><h2>Cấu trúc vòng thi</h2><button className="btn secondary" disabled={locked || names.length>=100} onClick={()=>{commit(g=>canEditRounds(g)?{...g,settings:{...g.settings,roundNames:[...gameRounds(g),`Vòng ${gameRounds(g).length+1}`]}}:g);onSelect(names.length+1);}}>+ Thêm vòng</button></div>
    {locked && <p>Kết thúc và tạo trận mới để thay đổi cấu trúc vòng thi.</p>}
    <div className="roundEditorList">{names.map((name,i)=><div className="roundEditorRow" key={`${i}-${name}`}>
      <b>{i+1}</b><input aria-label={`Tên vòng ${i+1}`} maxLength={80} disabled={locked} defaultValue={name} onBlur={e=>{const value=e.target.value.trim()||`Vòng ${i+1}`;e.target.value=value;commit(g=>canEditRounds(g)?{...g,settings:{...g.settings,roundNames:gameRounds(g).map((n,j)=>j===i?value:n)}}:g);}}/>
      <button className="btn secondary" onClick={()=>onSelect(i+1)}>{game.questions.filter(q=>q.round===i+1).length} câu · Soạn</button>
      <button className="btn secondary dangerText" aria-label={`Xóa vòng ${i+1}`} disabled={locked||names.length===1} onClick={()=>{if(!window.confirm(`Xóa vòng ${i+1} và ${game.questions.filter(q=>q.round===i+1).length} câu trong vòng này? Các vòng sau sẽ được đánh số lại.`))return;commit(g=>removeRound(g,i+1));onSelect(1);}}>Xóa</button>
    </div>)}</div>
    <p>Thêm hoặc xóa câu hỏi để đổi số câu trong mỗi vòng. Mở “Sửa câu hỏi” để chuyển câu sang vòng khác.</p>
  </section>;
}
