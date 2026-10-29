import {useLayoutEffect,useRef,type CSSProperties} from 'react';
import gsap from 'gsap';
import {Crown,Sparkles} from 'lucide-react';
import {QuestionBoard} from './QuestionBoard';
import {teamStyle} from './Common';
import {gameRounds,type Game} from './game';
export function SelectionStage({game}:{game:Game}){
 const root=useRef<HTMLDivElement>(null);
 const count=game.questions.filter(q=>q.round===game.round).length;
 const columns=Math.min(5,Math.max(1,count)),rows=Math.max(1,Math.ceil(count/columns));
 useLayoutEffect(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const ctx=gsap.context(()=>{gsap.fromTo('.showBoardTurn',{autoAlpha:0,y:10},{autoAlpha:1,y:0,duration:.4,ease:'power2.out'});},root);
  return ()=>ctx.revert();
 },[game.host]);
 useLayoutEffect(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const ctx=gsap.context(()=>{gsap.fromTo('.questionTile.chosen',{scale:.94},{scale:1,duration:.5,ease:'back.out(1.5)'});},root);
  return ()=>ctx.revert();
 },[game.boardSelectedId]);
 return <div ref={root} className="showBoard selectionStage" style={{...(game.host===null?{}:teamStyle(game.host)),'--board-columns':columns,'--board-rows':rows} as CSSProperties}>
  <div className="selectionHeading"><h1>Chọn câu hỏi</h1></div>
  <div className={`showBoardTurn ${game.host===null?'waiting':''}`} aria-live="polite">
   
   <div><span className="selectionTurnLabel">{game.host===null?'SẴN SÀNG ĐÓN THỬ THÁCH':'ĐỘI ĐANG CHỌN'}</span><strong>{game.host===null?'Chờ quản trò chọn đội':game.teams[game.host].name}</strong></div>
   {game.host!==null&&<Crown className="selectionCrown" size={28}/>}
  </div>
  <QuestionBoard game={game} audience/>
 </div>;
}
