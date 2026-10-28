import { useEffect, useRef, useState, type CSSProperties } from 'react';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import type { CardActivation, CardType } from '../game';
import { CARD_BACK, cardAbility, cardAnimationConfig as configs } from './cardAnimationConfig';
import './cards.css';
import { CardResultOverlay } from './CardResultOverlay';
function tone(context:AudioContext,frequency:number,duration:number,slide:number) {
 const oscillator=context.createOscillator(), gain=context.createGain();
 oscillator.connect(gain);gain.connect(context.destination);oscillator.type='triangle';
 oscillator.frequency.setValueAtTime(frequency,context.currentTime);oscillator.frequency.exponentialRampToValueAtTime(slide,context.currentTime+duration);
 gain.gain.setValueAtTime(.08,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+duration);
 oscillator.start();oscillator.stop(context.currentTime+duration);
}
export function CardActivationOverlay({event,onFinish,sound=false}:{event:CardActivation;onFinish:(id:string)=>void;sound?:boolean}) {
 const root=useRef<HTMLDivElement>(null), canvas=useRef<HTMLCanvasElement>(null);
 const config=configs[event.card];
 useEffect(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const burst=canvas.current ? confetti.create(canvas.current,{resize:true,useWorker:false}) : null;
  let audio:AudioContext|undefined;
  if(sound){try{audio=new AudioContext();void audio.resume().catch(()=>{});}catch{}}
  const ctx=gsap.context(()=>{
   const tl=gsap.timeline({defaults:{ease:'power3.out'},onComplete:()=>onFinish(event.id)});
   tl.addLabel('summon',0).addLabel('flight',.5).addLabel('slam',1.1).addLabel('reveal',1.5).addLabel('power',2.2).addLabel('exit',3.2);
   if(reduced){gsap.set('.cardCaption,.cardTeamBanner,.cardBackdropTitle',{opacity:1});tl.fromTo(root.current,{opacity:0},{opacity:1,duration:.2}).to(root.current,{opacity:0,duration:.2},1.1);return;}
   gsap.set('.powerCard',{rotationY:180});
   tl.fromTo('.summonPortal',{scale:.15,rotation:-60,opacity:0},{scale:1.15,rotation:55,opacity:.9,duration:2.8,ease:'power2.out'},'summon')
    .fromTo('.summonRing',{scale:.1,rotation:0,opacity:0},{scale:1.2,rotation:150,opacity:.7,duration:2.2},'summon')
    .fromTo('.summonBeam',{scaleX:0,opacity:0},{scaleX:3,opacity:1,duration:.5,repeat:1,yoyo:true},'slam')
    .fromTo('.cardOrbit',{rotation:-40,opacity:0,scale:.4},{rotation:100,opacity:1,scale:1,duration:1.6},'flight')
    .fromTo('.cardVeil',{opacity:0},{opacity:1,duration:.4},'summon')
    .fromTo('.cardTeamBanner',{y:-22,opacity:0},{y:0,opacity:1,duration:.45},'summon')
    .fromTo('.cardBackdropTitle',{scale:1.25,opacity:0},{scale:1,opacity:1,duration:.65,ease:'power4.out'},'reveal')
    .fromTo('.cardFlight',{x:(event.team-1.5)*innerWidth*.23,y:innerHeight*.5,scale:.16,rotation:-24,opacity:0},{x:(event.team-1.5)*100,y:-100,scale:.65,rotation:12,opacity:1,duration:.5},'summon')
    .call(()=>{if(audio?.state==='running')tone(audio,180,.45,900);},[],'summon')
    .to('.cardFlight',{x:0,y:-30,scale:1.12,rotation:-5,rotationX:15,duration:.6,ease:'power2.inOut'},'flight')
    .to('.cardFlight',{y:0,scale:1,rotation:0,rotationX:0,duration:.4,ease:'elastic.out(1,.5)'},'slam')
    .fromTo('.cardShock',{scale:.1,opacity:.9},{scale:3,opacity:0,duration:.65},'slam')
    .to('.cardStage',{x:8,duration:.04,repeat:4,yoyo:true},'slam')
    .set('.cardStage',{x:0},1.32)
    .call(()=>{if(audio?.state==='running')tone(audio,110,.3,36);burst?.({particleCount:80,spread:110,startVelocity:26,origin:{x:.5,y:.48},colors:[config.color,'#fff1cc'],disableForReducedMotion:true});},[],'slam')
    .to('.powerCard',{rotationY:0,duration:.7,ease:'power2.inOut'},'reveal')
    .fromTo('.cardCaption',{y:24,opacity:0},{y:0,opacity:1,duration:.4},1.85)
    .fromTo('.powerSymbol',{scale:.2,opacity:0,rotation:event.card==='steal'?-90:0},{scale:1,opacity:.8,rotation:0,duration:.7,ease:'back.out(2)'},'power')
    .fromTo('.powerAura',{scale:.65,opacity:0},{scale:1.3,opacity:1,duration:.7},'power')
    .fromTo('.powerSparks i',{scale:0,opacity:0},{scale:1,opacity:1,x:i=>Math.cos(i*1.9)*260,y:i=>Math.sin(i*1.9)*240,rotation:180,duration:.65,stagger:.02},'power')
    .call(()=>{if(audio?.state==='running')tone(audio,event.card==='safe'?520:330,.45,660);},[],'power');
   if(event.card==='double')tl.fromTo('.cardFlash',{opacity:0},{opacity:.5,duration:.12,repeat:1,yoyo:true},'power');
   if(event.card==='steal')tl.to('.powerSymbol',{x:(event.team-1.5)*innerWidth*.2,y:innerHeight*.3,scale:.2,opacity:0,duration:.7},2.55);
   if(event.card==='challenge')tl.to('.powerAura',{rotation:45,scale:1.5,duration:.25,repeat:1,yoyo:true},2.4);
   tl.to('.cardFlight',{scale:.7,y:-60,opacity:0,duration:.5},'exit').to('.cardCaption',{opacity:0,y:-12,duration:.4},'exit').to(root.current,{opacity:0,duration:.5},3.3);
  },root);
  const watchdog=setTimeout(()=>onFinish(event.id),4200);
  const hide=()=>{if(document.hidden)onFinish(event.id);};document.addEventListener('visibilitychange',hide);
  return()=>{clearTimeout(watchdog);document.removeEventListener('visibilitychange',hide);ctx.revert();burst?.reset();if(audio)void audio.close().catch(()=>{});};
 },[event.id]);
 return <div ref={root} className={`cardActivation card-${event.card}`} style={{'--power-color':config.color} as CSSProperties} role="status" aria-label={`${event.teamName} kích hoạt ${config.name}`}>
  <div className="cardVeil"/><div className="cardFlash"/><canvas ref={canvas} className="cardCanvas"/>
  <div className="cardTeamBanner"><b>{event.teamName}</b></div>
  <div className="cardStage"><div className="summonPortal"/><div className="summonRing"/><div className="summonBeam"/><div className="cardOrbit" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{transform:`rotate(${i*30}deg) translateX(min(28vh,25vw))`}}/>)}</div><h1 className="cardBackdropTitle" aria-hidden="true">{(event.card==='double' ? ['DOUBLE','HIGH RISK'] : event.card==='safe' ? ['SAFE','CHOICE'] : [config.name]).map(line=><span key={line}>{line}</span>)}</h1><div className="powerSymbol" aria-hidden="true">{config.symbol}</div><div className="powerAura"/><div className="cardShock"/>
   <div className="powerSparks" aria-hidden="true">{Array.from({length:16},(_,i)=><i key={i}>{event.card==='double'||event.card==='steal'?'●':'✦'}</i>)}</div>
   <div className="cardFlight"><div className="powerCard">
    <div className="cardFace cardFront"><img src={config.image} alt={config.name} onError={()=>onFinish(event.id)}/></div>
    <div className="cardFace cardReverse"><img src={CARD_BACK} alt="" aria-hidden="true" onError={()=>onFinish(event.id)}/></div>
   </div></div>
  </div>
  <div className="cardCaption"><h2>{cardAbility[event.card]}</h2>{event.targetName&&<strong>THÁCH ĐẤU → {event.targetName}</strong>}</div>
 </div>;
}
export function CardAnimationPlayer(props:{event:CardActivation;onFinish:(id:string)=>void;sound?:boolean}){
 return props.event.result ? <CardResultOverlay {...props}/> : <CardActivationOverlay {...props}/>;
}
export function AnimationPreview(){
 const [event,setEvent]=useState<CardActivation|null>(null),[sound,setSound]=useState(false);
 const [mode,setMode]=useState<'activate'|'correct'|'wrong'>('activate');
 const finish=()=>setEvent(null);
 return <main className="animationPreview"><a href="/">← Về bảng điều khiển</a><h1>Thử thẻ quyền năng</h1><p>Xem thử · Không thay đổi trận đấu.</p><label><input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/> Bật âm thanh</label><div className="previewMode" role="group" aria-label="Chế độ xem thử">{([['activate','Triệu hồi'],['correct','Trả lời đúng'],['wrong','Trả lời sai']] as const).map(([value,label])=><button key={value} disabled={!!event} aria-pressed={mode===value} onClick={()=>setMode(value)}>{label}</button>)}</div><div className="previewCards">{(Object.keys(configs) as CardType[]).map((card,i)=><button aria-label={configs[card].name} disabled={!!event} key={card} onClick={()=>setEvent({id:crypto.randomUUID(),at:Date.now(),card,team:i,teamName:`Đội ${i+1}`,targetName:card==='challenge'?'Đội 1':undefined,result:mode==='activate'?undefined:{correct:mode==='correct',delta:mode==='correct'?(card==='double'?40:20):(card==='safe'?0:card==='double'?-40:-20),total:mode==='correct'?(card==='double'?140:120):(card==='safe'?100:card==='double'?60:80),sourceName:'Đội 1'}})}><img src={configs[card].image} alt={configs[card].name}/></button>)}</div>{event&&<><CardAnimationPlayer event={event} onFinish={finish} sound={sound}/><button className="previewSkip" onClick={finish}>Bỏ qua hoạt ảnh</button></>}</main>;
}
