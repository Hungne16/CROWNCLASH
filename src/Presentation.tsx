import { QuestionBoard } from './QuestionBoard';
import { Crown, Expand, Check, Pause, Trophy, Zap, Swords, Shield, Sparkles, Volume2, VolumeX } from 'lucide-react';
import type {CSSProperties} from 'react';
import { DIFFICULTY, rankTeams, type Game } from './game';
import { currentQuestion, questionTime, tiedLeaders, rankingRows } from './controller';
import { Cards, formatTime, teamStyle } from './Common';
import './presentation.css';
export function Presentation({game,now,onBuzz,sound=false,onToggleSound}:{game:Game;now:number;onBuzz:(index:number)=>void;sound?:boolean;onToggleSound?:()=>void}){
 const q=currentQuestion(game),time=questionTime(game,now),ranks=rankTeams(game.teams);
 const roundQuestions=game.questions.filter(item=>item.round===game.round);
 const questionNumber=q?roundQuestions.findIndex(item=>item.id===q.id)+1:0;
 const response=['challenge','steal-answer'].includes(game.phase)?game.answering:game.host;
 const winner=game.suddenWinner??(tiedLeaders(game).length===1?ranks[0].index:null);
 const isQuestion=q&&!['setup','round-summary','finished','sudden-death'].includes(game.phase);
 const text=game.phase==='hint'?q?.hint:q?.text;
 const progress=q?Math.max(0,Math.min(100,time.remaining/(DIFFICULTY[q.difficulty].seconds*1000)*100)):0;
 const phaseLabel=game.phase==='hint'?(game.hintRead?'CHỐT QUYỀN NĂNG':'GỢI Ý'):game.phase==='challenge'?'THÁCH ĐẤU':game.phase==='steal-answer'?'CƯỚP LƯỢT':game.phase==='steal-window'?'CƠ HỘI STEAL':game.phase==='result'?'KẾT QUẢ':'CÂU HỎI';
 return <main className={`presentation showPresentation show-${game.phase}`}>
  <div className="showScenery" aria-hidden="true"><div className="showSpotlight left"/><div className="showSpotlight right"/><div className="showOrbit"/><div className="showFloor"/></div>
  <header className="showHeader">
   <div className="showBrand"><span><Crown size={28}/></span><b>CROWN<span>CLASH</span></b></div>
   <div className="showRounds" aria-label={`Vòng ${game.round} trên 3`}>{[1,2,3].map(round=><span key={round} className={game.round===round?'active':game.round>round?'complete':''}>{game.round>round?<Check size={14}/>:null}VÒNG 0{round}</span>)}</div>
   <div className="showHeaderActions">{onToggleSound&&<button className="showFullscreen" title={sound?"Tắt âm thanh":"Bật âm thanh"} aria-label={sound?"Tắt âm thanh":"Bật âm thanh"} onClick={onToggleSound}>{sound?<Volume2 size={19}/>:<VolumeX size={19}/>}</button>}<button className="showFullscreen" title="Toàn màn hình" aria-label="Toàn màn hình" onClick={()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()}><Expand size={20}/></button></div>
  </header>
  <section className="showStage" aria-label="Sân khấu câu hỏi">
   <div className="showStageFrame"/>
   <div className="showStageContent" key={`${game.phase}-${q?.id??game.round}`}>
   {game.phase==='setup'&&<div className="showBoard"><div className="showSectionLabel"><Sparkles size={16}/>VÒNG {game.round}</div><h1>Chọn câu hỏi</h1><div className="showBoardTurn">{game.host===null?'Sẵn sàng đón thử thách':game.teams[game.host].name}</div><QuestionBoard game={game} audience/></div>}
   {isQuestion&&<div className={`showQuestionLayout ${game.phase==='question'?'hasTimer':''}`}>
    <div className="showQuestionPanel">
     <div className="showQuestionMeta"><span className="showQuestionIndex">{String(questionNumber).padStart(2,'0')}</span><span className="showPhaseLabel">{phaseLabel}</span><span className="showPoints">{DIFFICULTY[q.difficulty].points}<small>ĐIỂM</small></span></div>
     <div className={`showQuestionBody ${q.image&&game.phase!=='hint'?'withImage':''}`}><h1 className={(text?.length??0)>220?'longQuestion':''}>{text||(game.phase==='hint'?'Lắng nghe gợi ý từ MC.':'')}</h1>{q.image&&game.phase!=='hint'&&<img src={q.image} alt="Hình minh họa câu hỏi"/>}</div>
     {game.phase==='result'&&game.answerRevealed&&<div className="showAnswer"><Check size={24}/><span>{q.answer}</span></div>}
     <div className="showQuestionBottom">{response!==null&&game.phase!=='result'&&<div className="showTurn" style={teamStyle(response)}><i/>{game.teams[response].name}{game.phase==='challenge'&&<Swords size={17}/>}</div>}{game.usedCard&&<div className="showPower">{game.usedCard==='double'?<><Zap size={17}/>CƯỢC LỚN ×2</>:<><Shield size={17}/>AN TOÀN</>}</div>}{game.phase==='hint'&&<span className="showHintState">{game.hintRead?'CHỌN THẺ TRƯỚC KHI MỞ CÂU HỎI':'CÂU HỎI CHƯA MỞ'}</span>}</div>
    </div>
    {game.phase==='question'&&<aside className={`audienceTimer showTimer ${time.seconds<=5?'urgent':''}`} style={{'--remaining':`${progress}%`} as CSSProperties} aria-label="Thời gian trả lời"><div className="showTimerDial"><span>{formatTime(time.seconds)}</span></div><b>{game.paused?<><Pause size={15}/>TẠM DỪNG</>:time.seconds===0?'HẾT GIỜ':'THỜI GIAN'}</b></aside>}
    {game.phase==='steal-window'&&<div className="showSteal"><Zap size={22}/><b>GIƠ THẺ STEAL</b><strong>{Math.max(0,Math.ceil(((game.stealDeadline??now)-now)/1000))}<small>s</small></strong></div>}
   </div>}
   {game.phase==='round-summary'&&<div className="showRoundResult"><div className="showSectionLabel"><Trophy size={18}/>VÒNG {game.round} HOÀN TẤT</div><h1>Bảng xếp hạng</h1><div className="showStandings">{rankingRows(game).map(({team,index,place,shared})=><div key={index} style={teamStyle(index)}><span className="showStandingPlace">{place===1&&winner!==null?<Crown size={24}/>:shared?`=${place}`:String(place).padStart(2,'0')}</span><b>{team.name}</b><strong>{team.score}</strong></div>)}</div></div>}
   {game.phase==='sudden-death'&&<div className="showSudden"><div className="showSectionLabel"><Zap size={18}/>SUDDEN DEATH</div><h1>{game.suddenQuestion||'Câu hỏi quyết định'}</h1><div className="showBuzzers">{game.suddenTeams.map(i=><button key={i} style={teamStyle(i)} className={game.answering===i?'buzzed':''} disabled={game.answering!==null} onClick={()=>onBuzz(i)}><Zap size={26}/><b>{game.teams[i].name}</b><span>{game.answering===i?'ĐÃ GIÀNH CHUÔNG':'BẤM CHUÔNG'}</span></button>)}</div></div>}
   {game.phase==='finished'&&<div className="showChampion"><div className="showTrophy"><Crown size={72}/></div><div className="showSectionLabel">{winner===null?'ĐỒNG HẠNG · CHỜ SUDDEN DEATH':'NHÀ VÔ ĐỊCH'}</div><h1>{winner===null?tiedLeaders(game).map(i=>game.teams[i].name).join(' · '):game.teams[winner].name}</h1>{winner!==null&&<div className="showWinnerPoints">{game.teams[winner].score}<span>ĐIỂM</span></div>}</div>}
   </div>
  </section>
  <section className="showPodiums" aria-label="Bảng điểm bốn đội">{game.teams.map((team,i)=>{
   const active=response===i&&(game.phase==='setup'||!!isQuestion&&game.phase!=='result');
   return <div key={i} style={teamStyle(i)} className={`showPodium ${active?'responding':''} ${winner===i&&game.phase==='finished'?'champion':''}`}><div className="showPodiumTop"><span className="showTeamNumber">0{i+1}</span><b>{team.name}</b>{active&&<span className="showOnAir" aria-label="Đội đang chơi"/>}</div><strong className="showTeamScore" key={team.score}>{team.score}</strong><Cards cards={team.cards}/><div className="showPodiumBase"/></div>;
  })}</section>
 </main>;
}
