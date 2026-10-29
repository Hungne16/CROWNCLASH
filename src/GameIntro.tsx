import {Crown,ArrowLeft,ArrowRight,Play,Expand} from 'lucide-react';
import {CardArt} from './Common';
import {gameRounds,type Game,type CardType} from './game';
import './intro.css';
type Slide={title:string;subtitle:string;lines:string[];card?:CardType};
export function introSlides(game:Game):Slide[]{return [
 {title:'CROWN CLASH',subtitle:'ĐẤU TRÍ · CHIẾN THUẬT · QUYỀN NĂNG',lines:[`4 đội · ${gameRounds(game).length} vòng thi đấu`,'Mỗi đội khởi đầu với 10 điểm. MC xác nhận đội đến lượt của từng câu.','Mỗi đội có 5 thẻ cho cả trận. Thẻ đã dùng không được cấp lại.']},
 {title:'Một câu hỏi diễn ra thế nào?',subtitle:'CHỌN SỐ → NGHE GỢI Ý → CHỌN THẺ → TRẢ LỜI',lines:['Mỗi vòng có 4 câu, mỗi đội chọn một câu; MC chọn đội đến lượt.','Chủ nhà chọn Cược lớn, An toàn hoặc không dùng thẻ.','MC mở câu hỏi, bắt đầu bấm giờ rồi xác nhận Đúng / Sai.','Chủ nhà có thể Thách đố; các đội khác có cơ hội Steal khi chủ nhà sai.']},
 {title:'Điểm số & thời gian',subtitle:'ĐÚNG CỘNG ĐIỂM · SAI TRỪ ĐIỂM',lines:['Dễ: 10 điểm · mặc định 30 giây · Challenge trong 15 giây đầu.','Trung bình: 20 điểm · mặc định 45 giây · Challenge trong 20 giây đầu.','Khó: 30 điểm · mặc định 60 giây · Challenge trong 30 giây đầu.','MC công bố thời gian thực tế của từng câu; thời gian có thể được điều chỉnh.']},
 {title:'Cược lớn',subtitle:'DOUBLE HIGH RISK · 1 THẺ / ĐỘI',card:'double',lines:['Chỉ chủ nhà dùng, sau gợi ý và trước khi mở câu hỏi.','Đúng: cộng gấp đôi. Sai: trừ gấp đôi.','Ví dụ câu 20 điểm: đúng +40 · sai −40.','Không dùng chung với An toàn trong cùng câu.']},
 {title:'An toàn',subtitle:'SAFE CHOICE · 1 THẺ / ĐỘI',card:'safe',lines:['Chỉ chủ nhà dùng, sau gợi ý và trước khi mở câu hỏi.','Đúng: cộng điểm gốc. Sai: không mất điểm.','Ví dụ câu 20 điểm: đúng +20 · sai 0.','Mỗi câu chỉ chọn một thẻ trước khi mở câu hỏi.']},
 {title:'Thách đố',subtitle:'CHALLENGE · 1 THẺ / ĐỘI',card:'challenge',lines:['Chủ nhà chỉ định một đội khác trả lời ngay trong hạn Challenge.','Đội bị thách đố: đúng cộng điểm gốc, sai trừ điểm gốc.','Double / Safe đã đặt sẽ cháy khi chủ nhà dùng Challenge.','Đội bị thách đố sai: câu hỏi kết thúc, không có Steal.',game.settings.challengeCorrect==='end'?'Đội bị thách đố đúng: kết thúc câu hỏi.':'Đội bị thách đố đúng: chủ nhà tiếp tục với điểm gốc.']},
 {title:'Cướp điểm',subtitle:'STEAL · 2 THẺ / ĐỘI',card:'steal',lines:['Sau khi chủ nhà trả lời sai, đội khác giơ thẻ Steal. MC xác nhận đội nhanh nhất.','Đúng cộng điểm gốc, sai trừ điểm gốc; không áp dụng Double / Safe.','Mỗi câu chỉ có tối đa một lượt Steal. Không Steal sau khi đội bị Challenge sai.',game.settings.stealSeconds>0?`Cửa Steal mở ${game.settings.stealSeconds} giây.`:'Trận này đang tắt cửa Steal.',game.settings.noSteal==='end'?'Không đội nào Steal: kết thúc câu hỏi.':'Không đội nào Steal: chủ nhà được trả lời lại.']},
 {title:'Ai sẽ giành vương miện?',subtitle:'TỔNG ĐIỂM → SỐ THẺ CÒN LẠI → SUDDEN DEATH',lines:['Kết thúc các vòng, đội có tổng điểm cao nhất dẫn đầu.','Nếu hòa điểm, đội còn nhiều thẻ hơn xếp trên.','Vẫn hòa: câu hỏi phụ tranh chuông, không dùng thẻ.','Trả lời đúng thắng. Trả lời sai nhường phần thắng cho đối thủ.',`Các vòng: ${gameRounds(game).join(' · ')}`]},
 ];}
export function GameIntro({game}:{game:Game}){
 const slides=introSlides(game),index=Math.max(0,Math.min(slides.length-1,game.introSlide??0)),slide=slides[index];
 return <section className="gameIntro" aria-label="Giới thiệu luật chơi">
 <header><span><Crown size={22}/> CROWNCLASH</span><span>LUẬT CHƠI · {index+1} / {slides.length}</span><button aria-label="Toàn màn hình intro" onClick={()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()}><Expand size={18}/></button></header>
 <div className={`introScene ${slide.card?'introWithCard':''}`} key={index}>
 {slide.card&&<CardArt card={slide.card} className="introCard"/>}
 <div className="introCopy"><div className="introEyebrow">{slide.subtitle}</div><h1>{slide.title}</h1><ul>{slide.lines.map(line=><li key={line}>{line}</li>)}</ul></div></div>
 <footer>{slides.map((s,i)=><i key={s.title} className={i===index?'active':''}/>)}<span>SẴN SÀNG CHO THỬ THÁCH?</span></footer>
 </section>;
}
export function IntroControl({game,commit,onAudience}:{game:Game;commit:(fn:(g:Game)=>Game)=>void;onAudience:()=>void}){
 const slides=introSlides(game),index=game.introSlide??0;
 const go=(slide:number|null)=>commit(g=>({...g,introSlide:slide}));
 return <main className="introControl"><div className="introControlBar"><b>Giới thiệu luật chơi</b><button onClick={onAudience}>Mở màn hình chiếu ↗</button><button onClick={()=>go(null)}>Bỏ qua intro</button></div>
 <div className="introPreview"><GameIntro game={game}/></div>
 <nav><button disabled={index===0} onClick={()=>go(index-1)}><ArrowLeft size={18}/>Trang trước</button><span>{index+1} / {slides.length}</span><button onClick={()=>go(index===slides.length-1?null:index+1)}>{index===slides.length-1?<><Play size={18}/>Vào trò chơi</>:<>Tiếp theo<ArrowRight size={18}/></>}</button></nav></main>;
}
