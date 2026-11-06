import {Crown,ArrowLeft,ArrowRight,Play,Expand} from 'lucide-react';
import {CardArt} from './Common';
import {DIFFICULTY,type Game,type CardType} from './game';
import './intro.css';
type Slide={title:string;subtitle:string;lines:string[];card?:CardType};
export function introSlides(game: Game): Slide[] {
  return [
    {
      title: 'CROWN CLASH',
      subtitle: 'GAME OVERVIEW',
      lines: [
        'Starting points — All four teams start with 10 points.',
        'Game structure — Three rounds, with four questions per round.',
        'Turn order — Draw lots before each round to decide the answering order.',
      ],
    },
    {
      title: 'Scoring & time limits',
      subtitle: 'BASE POINTS & THINKING TIME',
      lines: Object.values(DIFFICULTY).map(({ label, points, seconds }) =>
        `${label === 'Hard' ? 'Difficult' : label} — ${points} points · ${seconds} seconds`,
      ),
    },
    {
      title: 'Double High Risk',
      subtitle: 'DOUBLE DOWN!',
      card: 'double',
      lines: [
        'Only the host team can play this card before the question is revealed.',
        'Correct answer — Gain double the base points.',
        'Incorrect answer — Lose double the base points.',
      ],
    },
    {
      title: 'Safe Choice',
      subtitle: 'PLAY IT SAFE!',
      card: 'safe',
      lines: [
        'Only the host team can play this card before the question is revealed.',
        'Correct answer — Gain the base points.',
        'Incorrect answer — Lose zero points.',
      ],
    },
    {
      title: 'Challenge',
      subtitle: 'HOST TEAM ONLY',
      card: 'challenge',
      lines: [
        'After the reveal, play during the first half of the thinking time to pass the question to another team.',
        game.settings.challengeCorrect === 'end'
          ? 'Correct answer — The challenged team gains the base points.'
          : 'Correct answer — The challenged team gains the base points, then the host team can answer.',
        'Incorrect answer — The challenged team loses the base points and the turn ends immediately.',
      ],
    },
    {
      title: 'Steal',
      subtitle: 'OTHER TEAMS ONLY',
      card: 'steal',
      lines: [
        'If the host team answers incorrectly, the first eligible team to raise its Steal card takes over.',
        'Correct answer — Gain the base points. Incorrect answer — Lose the base points.',
        'Only one Steal attempt per question. A wrong answer by a challenged team ends the turn without Steal.',
      ],
    },
    {
      title: 'Who takes the crown?',
      subtitle: 'TOTAL POINTS → UNUSED CARDS → SUDDEN DEATH',
      lines: [
        'The team with the highest total score wins.',
        'If scores are tied, the team with more unused cards ranks higher.',
        'If teams are still tied, they face a Sudden Death buzzer question with no cards.',
        'A correct answer wins. With two teams remaining, a wrong answer hands the win to the other team.',
      ],
    },
  ];
}
export function GameIntro({game}:{game:Game}){
 const slides=introSlides(game),index=Math.max(0,Math.min(slides.length-1,game.introSlide??0)),slide=slides[index];
 return <section lang="en" className="gameIntro" aria-label="Game Rules">
 <header><span><Crown size={22}/> CROWNCLASH</span><span>GAME RULES · {index+1} / {slides.length}</span><button aria-label="Toggle full screen" onClick={()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()}><Expand size={18}/></button></header>
 <div className={`introScene ${slide.card?'introWithCard':''}`} key={index}>
 {slide.card && <CardArt card={slide.card} className="introCard" />}
 <div className="introCopy"><div className="introEyebrow">{slide.subtitle}</div><h1>{slide.title}</h1><ul>{slide.lines.map(line=><li key={line}>{line}</li>)}</ul></div></div>
 <footer>{slides.map((s,i)=><i key={s.title} className={i===index?'active':''}/>)}<span>READY FOR THE CHALLENGE?</span></footer>
 </section>;
}
export function IntroControl({game,commit,onAudience}:{game:Game;commit:(fn:(g:Game)=>Game)=>void;onAudience:()=>void}){
 const slides=introSlides(game),index=Math.max(0,Math.min(slides.length-1,game.introSlide??0));
 const go=(slide:number|null)=>commit(g=>({...g,introSlide:slide}));
 return <main lang="en" className="introControl"><div className="introControlBar"><b>Game Rules</b><button onClick={onAudience}>Open Audience Screen ↗</button><button onClick={()=>go(null)}>Skip Intro</button></div>
 <div className="introPreview"><GameIntro game={game}/></div>
 <nav><button disabled={index===0} onClick={()=>go(index-1)}><ArrowLeft size={18}/>Previous</button><span>{index+1} / {slides.length}</span><button onClick={()=>go(index===slides.length-1?null:index+1)}>{index===slides.length-1?<><Play size={18}/>Start Game</>:<>Next<ArrowRight size={18}/></>}</button></nav></main>;
}
