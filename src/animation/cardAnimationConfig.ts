import type { CardType } from '../game';
export const cardAnimationConfig:Record<CardType,{name:string;message:string;color:string;image:string;symbol:string}> = {
 double:{name:'DOUBLE HIGH RISK',message:'HIGH RISK ×2',color:'#ffb348',image:'/cards/double.webp',symbol:'×2'},
 safe:{name:'SAFE CHOICE',message:'PROTECTED',color:'#78e7ee',image:'/cards/safe.webp',symbol:'◇'},
 challenge:{name:'CHALLENGE',message:'CHALLENGE ACCEPTED',color:'#d7a6ff',image:'/cards/challenge.webp',symbol:'ϟ'},
 steal:{name:'STEAL',message:'STEAL ACTIVATED',color:'#f8d276',image:'/cards/steal.webp',symbol:'♛'},
};
export const CARD_BACK = '/cards/back.webp';
export const cardAbility:Record<CardType,string> = {double:'ĐÚNG ×2 · SAI ×2',safe:'SAI KHÔNG MẤT ĐIỂM',challenge:'CHUYỂN QUYỀN TRẢ LỜI',steal:'GIÀNH QUYỀN TRẢ LỜI'};
export const ANIMATION_MS = 4000;
export function preloadCards() { return [CARD_BACK,...Object.values(cardAnimationConfig).map(c=>c.image)].map(src=>{const image=new Image();image.src=src;return image;}); }

export const RESULT_MS = 10600;
export const cardResultAssets:Record<CardType,string> = {double:'/cards/results/double.webp',safe:'/cards/results/safe.webp',challenge:'/cards/results/challenge.webp',steal:'/cards/results/steal.webp'};
export const animationDuration = (event:import('../game').CardActivation) => event.result ? RESULT_MS : ANIMATION_MS;
