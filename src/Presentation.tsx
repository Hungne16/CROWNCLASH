import {SelectionStage} from './SelectionStage';
import {GameIntro} from './GameIntro';
import { BannerLeaderboard } from './leaderboard/BannerLeaderboard';
import { QuestionBoard } from './QuestionBoard';
import { Crown, Expand, Check, Pause, Trophy, Zap, Swords, Shield, Sparkles, Volume2, VolumeX } from 'lucide-react';
import {useLayoutEffect, useRef, type CSSProperties} from 'react';
import { DIFFICULTY, gameRounds, questionSeconds, rankTeams, type Game } from './game';
import { currentQuestion, questionTime, tiedLeaders, rankingRows } from './controller';
import { CardArt, Cards, formatTime, teamStyle } from './Common';
import './presentation.css';
export function Presentation({game,now,onBuzz,sound=false,onToggleSound}:{game:Game;now:number;onBuzz:(index:number)=>void;sound?:boolean;onToggleSound?:()=>void}){
 const q=currentQuestion(game),time=questionTime(game,now),ranks=rankTeams(game.teams);
 const roundQuestions=game.questions.filter(item=>item.round===game.round);
 const questionNumber=q?roundQuestions.findIndex(item=>item.id===q.id)+1:0;
 const response=['challenge','steal-answer'].includes(game.phase)?game.answering:game.host;
 const winner=game.suddenWinner??(tiedLeaders(game).length===1?ranks[0].index:null);
 const isQuestion=q&&!['setup','round-summary','finished','sudden-death'].includes(game.phase);
 const text=game.phase==='hint'?q?.hint:q?.text;
 const progress=q?Math.max(0,Math.min(100,time.remaining/(questionSeconds(q)*1000)*100)):0;
 const phaseLabel=game.phase==='hint'?(game.hintRead?'CHỐT QUYỀN NĂNG':'GỢI Ý'):game.phase==='challenge'?'THÁCH ĐẤU':game.phase==='steal-answer'?'CƯỚP LƯỢT':game.phase==='steal-window'?'CƠ HỘI STEAL':game.phase==='result'?'KẾT QUẢ':'CÂU HỎI';
 if(game.introSlide!=null) return <GameIntro game={game}/>;
 if(game.phase==='round-summary'||game.phase==='finished') return <BannerLeaderboard game={game}/>;
 return <main className={`presentation showPresentation show-${game.phase}`}>
  <div className="showScenery" aria-hidden="true"><div className="showSpotlight left"/><div className="showSpotlight right"/><div className="showOrbit"/><div className="showFloor"/></div>
  <header className="showHeader">
   <div className="showBrand"><span><Crown size={28}/></span><b>CROWN<span>CLASH</span></b></div>
   <div className="showRounds" aria-label={`Vòng ${game.round} trên ${gameRounds(game).length}`}>{gameRounds(game).map((name,i)=>{const round=i+1; return <span key={round} className={game.round===round?'active':game.round>round?'complete':''}>{game.round>round?<Check size={14}/>:null}{name}</span>})}</div>
   <div className="showHeaderActions">{onToggleSound&&<button className="showFullscreen" title={sound?"Tắt âm thanh":"Bật âm thanh"} aria-label={sound?"Tắt âm thanh":"Bật âm thanh"} onClick={onToggleSound}>{sound?<Volume2 size={19}/>:<VolumeX size={19}/>}</button>}<button className="showFullscreen" title="Toàn màn hình" aria-label="Toàn màn hình" onClick={()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()}><Expand size={20}/></button></div>
  </header>
  <section className="showStage" aria-label="Sân khấu câu hỏi">
   <div className="showStageFrame"/>
   <div className="showStageContent" key={`${game.phase}-${q?.id??game.round}`}>
   {game.phase==='setup'&&<SelectionStage game={game}/>}
   {isQuestion&&<div className={`showQuestionLayout ${game.phase==='question'?'hasTimer':''}`}>
    <div className="showQuestionPanel">
     <div className="showQuestionMeta"><span className="showQuestionIndex">{String(questionNumber).padStart(2,'0')}</span>{game.phase!=='question'&&<span className="showPhaseLabel">{phaseLabel}</span>}<span className="showPoints">{DIFFICULTY[q.difficulty].points}<small>ĐIỂM</small></span></div>
     <div className={`showQuestionBody ${q.image&&game.phase!=='hint'?'withImage':''}`}><FitText text={text||(game.phase==='hint'?'Lắng nghe gợi ý từ MC.':'')} />{q.image&&game.phase!=='hint'&&<img src={q.image} alt="Hình minh họa câu hỏi"/>}</div>
     {game.phase==='result'&&game.answerRevealed&&<div className="showAnswer"><Check size={24}/><FitText text={q.answer}/></div>}
     <div className="showQuestionBottom">{response!==null&&game.phase!=='result'&&<div className="showTurn" style={teamStyle(response)}><i/>{game.teams[response].name}{game.phase==='challenge'&&<CardArt card="challenge" className="inlineCardArt"/>}</div>}{game.usedCard&&<div className="showPower">{game.usedCard==='double'?<><CardArt card="double" className="inlineCardArt"/>CƯỢC LỚN ×2</>:<><CardArt card="safe" className="inlineCardArt"/>AN TOÀN</>}</div>}</div>
    </div>
    {game.phase==='question'&&<aside className={`audienceTimer showTimer ${time.seconds<=5?'urgent':''}`} style={{'--remaining':`${progress}%`} as CSSProperties} aria-label="Thời gian trả lời"><div className="showTimerDial"><span>{formatTime(time.seconds)}</span></div><b>{game.paused?<><Pause size={15}/>{game.startedAt===null?'CHỜ BẮT ĐẦU':'TẠM DỪNG'}</>:time.seconds===0?'HẾT GIỜ':null}</b></aside>}
    {game.phase==='steal-window'&&<div className="showSteal"><CardArt card="steal" className="inlineCardArt"/><b>GIƠ THẺ STEAL</b><strong>{Math.max(0,Math.ceil(((game.stealDeadline??now)-now)/1000))}<small>s</small></strong></div>}
   </div>}
   {game.phase==='sudden-death'&&<div className="showSudden"><div className="showSectionLabel"><Zap size={18}/>SUDDEN DEATH</div><FitText text={game.suddenQuestion||'Câu hỏi quyết định'}/><div className="showBuzzers">{game.suddenTeams.map(i=><button key={i} style={teamStyle(i)} className={game.answering===i?'buzzed':''} disabled={game.answering!==null} onClick={()=>onBuzz(i)}><Zap size={26}/><b>{game.teams[i].name}</b><span>{game.answering===i?'ĐÃ GIÀNH CHUÔNG':'BẤM CHUÔNG'}</span></button>)}</div></div>}
   </div>
  </section>
  <section className="showPodiums" aria-label="Bảng điểm bốn đội">{game.teams.map((team,i)=>{
   const active=response===i&&(game.phase==='setup'||!!isQuestion&&game.phase!=='result');
   return <div key={i} style={teamStyle(i)} className={`showPodium ${active?'responding':''} ${winner===i&&game.phase==='finished'?'champion':''}`}><div className="showPodiumTop"><span className="showTeamCrest" aria-hidden="true"><Crown size={20}/></span><b>{team.name}</b>{active&&<span className="showOnAir" aria-label="Đội đang chơi"/>}</div><strong className="showTeamScore" key={team.score}>{team.score}</strong><Cards cards={team.cards}/><div className="showPodiumBase"/></div>;
  })}</section>
 </main>;
}

function FitText({text}:{text:string}) {
 const box=useRef<HTMLDivElement>(null), content=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const fit=()=>{
   if(!box.current||!content.current)return;
   const el=content.current,host=box.current;
   let low=1,high=Math.min(62,window.innerHeight*.06);
   for(let i=0;i<12;i++){
    const mid=(low+high)/2;el.style.fontSize=mid+'px';
    if(el.scrollHeight<=host.clientHeight && el.scrollWidth<=host.clientWidth)low=mid;else high=mid;
   }
   el.style.fontSize=low+'px';
  };
  const observer=new ResizeObserver(fit);if(box.current)observer.observe(box.current);
  fit();void document.fonts.ready.then(fit);
  return ()=>observer.disconnect();
 },[text]);
 return <div ref={box} className="showFitBox"><div ref={content} className="showFitText">{text}</div></div>;
}
