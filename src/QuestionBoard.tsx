import { Check } from 'lucide-react';
import type {Game} from './game';
import './questionBoard.css';
export function questionSlots(game:Game){
 const questions=game.questions.filter(q=>q.round===game.round);
 return Array.from({length:questions.length},(_,i)=>({number:i+1,question:questions[i],used:questions[i] ? (game.playedQuestionIds??[]).includes(questions[i].id):false,selected:!!questions[i]&&game.boardSelectedId===questions[i].id}));
}
export function QuestionBoard({game,onChoose,disabled=false,audience=false}:{game:Game;onChoose?:(id:string)=>void;disabled?:boolean;audience?:boolean}){
 return <div className={`questionBoard ${audience?'questionBoardAudience':''}`} aria-label={`Bảng chọn câu hỏi vòng ${game.round}`}>
  {questionSlots(game).map(({number,question,used,selected})=>{
   const label=`Câu ${number}${used?' · Đã chơi':selected?' · Đã chọn':!question?' · Chưa soạn':''}`;
   const content=<><strong>{number}</strong>{used?<span><Check size={18}/>Đã chơi</span>:selected?<span>Đã chọn</span>:!question&&!audience?<span>Chưa soạn</span>:null}</>;
   const className=`questionTile ${used?'played':''} ${selected&&!used?'chosen':''} ${!question?'unavailable':''}`;
   return audience?<div key={number} className={className} aria-label={label}>{content}</div>:<button type="button" key={number} className={className} aria-label={label} aria-pressed={selected&&!used} disabled={disabled||used||!question} onClick={()=>question&&onChoose?.(question.id)}>{content}</button>;
  })}
 </div>;
}
