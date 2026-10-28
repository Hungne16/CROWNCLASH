import {useEffect,useRef,useState,type CSSProperties} from 'react';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import type {CardActivation} from '../game';
import {cardAnimationConfig,RESULT_MS} from './cardAnimationConfig';
export function CardResultOverlay({event,onFinish,sound=false}:{event:CardActivation;onFinish:(id:string)=>void;sound?:boolean}){
 const root=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const [reduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const result=event.result!,config=cardAnimationConfig[event.card];
 useEffect(()=>{
  const burst=canvas.current?confetti.create(canvas.current,{resize:true}):null;
  let audio:AudioContext|undefined;
  if(sound){try{audio=new AudioContext();const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.connect(gain);gain.connect(audio.destination);oscillator.frequency.setValueAtTime(result.delta<0?180:440,audio.currentTime);oscillator.frequency.exponentialRampToValueAtTime(result.delta<0?90:880,audio.currentTime+.4);gain.gain.setValueAtTime(.05,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.5);oscillator.start();oscillator.stop(audio.currentTime+.5);}catch{}}
  const ctx=gsap.context(()=>{
   const tl=gsap.timeline({onComplete:()=>onFinish(event.id)});
   tl.fromTo(root.current,{opacity:0},{opacity:1,duration:.2})
    .fromTo('.resultArt',{y:reduced?0:50,scale:reduced?1:.85,opacity:0},{y:0,scale:1,opacity:1,duration:.45},0)
    .fromTo('.resultDelta',{scale:reduced?1:.4,opacity:0},{scale:1,opacity:1,duration:.65,ease:'back.out(2)'},.15);
   if(!reduced)tl.to('.resultArt',{y:-8,rotation:result.delta<0?-1:1,duration:1.1,repeat:6,yoyo:true,ease:'sine.inOut'},.8);
   if(result.delta>0&&!reduced)tl.call(()=>{burst?.({particleCount:75,spread:100,origin:{x:.7,y:.5},colors:[config.color,'#fff1cc'],disableForReducedMotion:true});},[],.4);
   tl.to(root.current,{opacity:0,duration:.35},reduced?1.4:10.15);
  },root);
  const watchdog=setTimeout(()=>onFinish(event.id),RESULT_MS);
  const hide=()=>{if(document.hidden)onFinish(event.id);};document.addEventListener('visibilitychange',hide);
  return()=>{ctx.revert();burst?.reset();clearTimeout(watchdog);document.removeEventListener('visibilitychange',hide);if(audio)void audio.close().catch(()=>{});};
 },[event.id]);
 return <div ref={root} className={`cardResult ${result.delta<0?'resultLoss':'resultGain'}`} style={{'--power-color':config.color} as CSSProperties} role="status" aria-label={`${event.teamName}: ${result.delta} điểm`}>
  <div className="resultHalo"/><canvas ref={canvas} className="cardCanvas"/>
  <div className="resultArt"><img src={config.image} alt={config.name}/></div>
  <div className="resultCopy"><h1>{event.teamName}</h1><strong className="resultDelta">{result.delta>0?'+':''}{result.delta}<span>ĐIỂM</span></strong><h2>{result.delta===0&&event.card==='safe'?'ĐƯỢC BẢO VỆ':result.correct?'CHÍNH XÁC':'CHƯA CHÍNH XÁC'}</h2><p>Tổng điểm <b>{result.total}</b></p>{event.card==='challenge'&&<div className="resultSource">Thách đấu từ {result.sourceName}</div>}</div>
 </div>;
}
