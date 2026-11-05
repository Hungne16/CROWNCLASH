import {Crown,ArrowLeft,ArrowRight,Play,Expand} from 'lucide-react';
import {CARD_INFO} from './Common';
import {gameRounds,type Game,type CardType} from './game';
import './intro.css';
type Slide={title:string;subtitle:string;lines:string[];card?:CardType};
export function introSlides(game:Game):Slide[]{return [
 {title:'CROWN CLASH',subtitle:'QUIZ · STRATEGY · POWER CARDS',lines:[`4 teams · ${gameRounds(game).length} rounds`,'Each team starts with 10 points. The host selects which team takes each turn.','Each team receives five cards for the whole match. Used cards are not replaced.']},
 {title:'How a turn works',subtitle:'PICK A NUMBER → HEAR THE HINT → CHOOSE A CARD → ANSWER',lines:['Each team gets one turn to pick a question per round.','After the hint, the team can play Double High Risk or Safe Choice, or save its cards.','The host reveals the question, starts the timer, and marks the answer correct or incorrect.','The team that picked the question may play Challenge. If it answers incorrectly, another team may play Steal.']},
 {title:'Scoring & time limits',subtitle:'GAIN POINTS FOR CORRECT ANSWERS · LOSE POINTS FOR WRONG ANSWERS',lines:['Easy — 10 points, 30 seconds by default, Challenge within the first 15 seconds.','Medium — 20 points, 45 seconds by default, Challenge within the first 20 seconds.','Hard — 30 points, 60 seconds by default, Challenge within the first 30 seconds.','The host can adjust the time limit for each question.']},
 {title:'Double High Risk',subtitle:'1 CARD PER TEAM',card:'double',lines:['Only the team that picked the question can play this card, after the hint and before the reveal.','A correct answer earns double the base points. An incorrect answer loses double the base points.','On a 20-point question, gain 40 or lose 40.','Play either Double High Risk or Safe Choice on a question.']},
 {title:'Safe Choice',subtitle:'1 CARD PER TEAM',card:'safe',lines:['Only the team that picked the question can play this card, after the hint and before the reveal.','A correct answer earns the base points. An incorrect answer costs zero points.','On a 20-point question, gain 20 or lose zero.']},
 {title:'Challenge',subtitle:'1 CARD PER TEAM',card:'challenge',lines:['Within the Challenge time limit, the team that picked the question can make another team answer immediately.','The challenged team gains or loses the base points.','Challenge discards any Double High Risk or Safe Choice already played on that question.','A wrong answer ends the question and closes the Steal opportunity.',game.settings.challengeCorrect==='end'?'A correct answer ends the question.':'After a correct answer, the original team can answer for base points.']},
 {title:'Steal',subtitle:'2 CARDS PER TEAM',card:'steal',lines:['After the team that picked the question answers incorrectly, the host recognizes the first eligible team to raise its Steal card.','The stealing team gains or loses the base points.','Each question allows one Steal attempt. A failed Challenge ends the question immediately.',game.settings.stealSeconds>0?`The Steal window lasts ${game.settings.stealSeconds} seconds.`:'Steal is disabled for this match.',game.settings.noSteal==='end'?'If nobody plays Steal, the question ends.':'If nobody plays Steal, the original team can answer again.']},
 {title:'Who takes the crown?',subtitle:'TOTAL POINTS → UNUSED CARDS → SUDDEN DEATH',lines:['The team with the highest total score wins.','If scores are tied, the team with more unused cards ranks higher.','If teams are still tied, they face a Sudden Death buzzer question with no cards.','A correct answer wins. With two teams remaining, a wrong answer hands the win to the other team.']},
 ];}
export function GameIntro({game}:{game:Game}){
 const slides=introSlides(game),index=Math.max(0,Math.min(slides.length-1,game.introSlide??0)),slide=slides[index];
 const CardIcon = slide.card ? CARD_INFO[slide.card].icon : null;
 return <section lang="en" className="gameIntro" aria-label="Game Rules">
 <header><span><Crown size={22}/> CROWNCLASH</span><span>GAME RULES · {index+1} / {slides.length}</span><button aria-label="Toggle full screen" onClick={()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()}><Expand size={18}/></button></header>
 <div className={`introScene ${slide.card?'introWithCard':''}`} key={index}>
 {CardIcon&&<div className="introCard introRuleEmblem" aria-hidden="true"><CardIcon/></div>}
 <div className="introCopy"><div className="introEyebrow">{slide.subtitle}</div><h1>{slide.title}</h1><ul>{slide.lines.map(line=><li key={line}>{line}</li>)}</ul></div></div>
 <footer>{slides.map((s,i)=><i key={s.title} className={i===index?'active':''}/>)}<span>READY FOR THE CHALLENGE?</span></footer>
 </section>;
}
export function IntroControl({game,commit,onAudience}:{game:Game;commit:(fn:(g:Game)=>Game)=>void;onAudience:()=>void}){
 const slides=introSlides(game),index=game.introSlide??0;
 const go=(slide:number|null)=>commit(g=>({...g,introSlide:slide}));
 return <main lang="en" className="introControl"><div className="introControlBar"><b>Game Rules</b><button onClick={onAudience}>Open Audience Screen ↗</button><button onClick={()=>go(null)}>Skip Intro</button></div>
 <div className="introPreview"><GameIntro game={game}/></div>
 <nav><button disabled={index===0} onClick={()=>go(index-1)}><ArrowLeft size={18}/>Previous</button><span>{index+1} / {slides.length}</span><button onClick={()=>go(index===slides.length-1?null:index+1)}>{index===slides.length-1?<><Play size={18}/>Start Game</>:<>Next<ArrowRight size={18}/></>}</button></nav></main>;
}
