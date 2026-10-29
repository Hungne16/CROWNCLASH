import {useLayoutEffect,useRef,type CSSProperties} from 'react';
import gsap from 'gsap';
import {ShieldCheck,Sparkles} from 'lucide-react';
import {CardArt,teamStyle} from './Common';
import {DIFFICULTY,type Game} from './game';
import {currentQuestion} from './controller';

export function PowerChoiceStage({game}:{game:Game}){
 const root=useRef<HTMLDivElement>(null),host=game.host,card=game.usedCard??game.cardPreview??'none';
 const points=DIFFICULTY[currentQuestion(game)?.difficulty??'easy'].points;
 useLayoutEffect(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const ctx=gsap.context(()=>{gsap.fromTo('.powerChoiceTile',{y:45,rotationY:-18,opacity:0},{y:0,rotationY:0,opacity:1,duration:.7,stagger:.12,ease:'power3.out'});},root);
  return ()=>ctx.revert();
 },[]);
 useLayoutEffect(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const ctx=gsap.context(()=>{gsap.fromTo('.powerChoiceTile.selected .choiceArt',{scale:.9},{scale:1,duration:.55,ease:'back.out(1.5)'});gsap.fromTo('.choiceSeal',{opacity:0,y:8},{opacity:1,y:0,duration:.35});},root);
  return ()=>ctx.revert();
 },[card]);
 if(host===null)return null;
 return <div className="powerChoiceStage" ref={root} style={teamStyle(host)}>
 <div className="choiceHeading"><span>{game.teams[host].name}</span><h1>Chọn quyền năng</h1></div>
 <div className="choiceDeck">{(['none','double','safe'] as const).map((id,i)=>{
 const empty=id!=='none'&&game.teams[host].cards[id]===0&&game.usedCard!==id;
 return <div key={id} className={`powerChoiceTile ${card===id?'selected':''} ${empty?'unavailable':''}`} style={{'--card-accent':['#a9bdd2','#ffbb69','#73dfde'][i]} as CSSProperties}>
 <div className="choiceHalo"/><div className="choiceArt">{id==='none'?<div className="choiceNoCard"><ShieldCheck size={64}/></div>:<CardArt card={id}/>}</div>
 <div className="choiceTileCaption"><b>{id==='none'?'Giữ thẻ':id==='double'?'Cược lớn':'An toàn'}</b><span>{empty?'Đã hết thẻ':id==='double'?`+${points*2} / −${points*2}`:id==='safe'?`+${points} / 0`:`+${points} / −${points}`}</span></div>
 {card===id&&<div className="choiceSeal"><Sparkles size={14}/>{game.usedCard?'ĐÃ KÍCH HOẠT':'ĐANG CHỌN'}</div>}
 </div>})}</div>
 </div>;
}
