import type { Game } from '../game';
export const VIDEO = { width:1280, height:720, src:'/video/banner-hall.mp4' };
export const LAYOUT_KEY='crown-banner-layout-v1';
export type BannerId='red'|'green'|'purple'|'blue';
export type Region={centerX:number;centerY:number;width:number;height:number;scale:number;rotation:number;lineHeight:number};
export type Layout=Record<BannerId,Region>;
export const FLAGS: {id:BannerId;rank:number;label:string}[]=[
  {id:'red',rank:4,label:'Đỏ · TOP 4'}, {id:'green',rank:2,label:'Xanh lá · TOP 2'},
  {id:'purple',rank:1,label:'Tím · TOP 1'}, {id:'blue',rank:3,label:'Xanh dương · TOP 3'},
];
// Measured on source frames at 0, 4 and 8 seconds. Rectangles deliberately
// exclude the large crest above and gold stars / hems below each fabric area.
const rect=(x:number,y:number,w:number,h:number):Region=>({centerX:x/1280,centerY:y/720,width:w/1280,height:h/720,scale:1,rotation:0,lineHeight:1.08});
export const DEFAULT_LAYOUT:Layout={red:rect(280,481,56,40),green:rect(473,419,60,68),purple:rect(705,389,86,70),blue:rect(936,430,66,68)};
export function coverTransform(width:number,height:number,videoWidth=VIDEO.width,videoHeight=VIDEO.height){
  const scale=Math.max(width/videoWidth,height/videoHeight);
  return {scale,x:(width-videoWidth*scale)/2,y:(height-videoHeight*scale)/2};
}
export function validLayout(value:unknown):value is Layout {
  if(!value||typeof value!=='object')return false;
  return FLAGS.every(({id})=>{
    const r=(value as Layout)[id];
    return r&&Object.values(r).every(v=>typeof v==='number'&&Number.isFinite(v))&&
      r.centerX>=0&&r.centerX<=1&&r.centerY>=0&&r.centerY<=1&&r.width>=.01&&r.width<=.4&&r.height>=.02&&r.height<=.4&&
      r.scale>=.3&&r.scale<=3&&r.rotation>=-30&&r.rotation<=30&&r.lineHeight>=.8&&r.lineHeight<=2&&
      r.centerX-r.width/2>=0&&r.centerX+r.width/2<=1&&r.centerY-r.height/2>=0&&r.centerY+r.height/2<=1;
  });
}
export function readLayout():Layout {
  try {const saved=JSON.parse(localStorage.getItem(LAYOUT_KEY)||'null');if(validLayout(saved))return saved;}catch{}
  return structuredClone(DEFAULT_LAYOUT);
}
// Score order is primary. Equal scores retain the game's existing remaining-card
// tiebreak; team index is only a stable display order, never a score mutation.
export function bannerRanking(game:Game){
  const cards=(i:number)=>Object.values(game.teams[i].cards).reduce((a,b)=>a+b,0);
  return game.teams.map((team,index)=>({team,index})).sort((a,b)=>b.team.score-a.team.score||
    Number(b.index===game.suddenWinner)-Number(a.index===game.suddenWinner)||cards(b.index)-cards(a.index)||a.index-b.index);
}
