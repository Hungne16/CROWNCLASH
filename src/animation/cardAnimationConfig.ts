import { CARD_ASSETS, CARD_BACK_ASSET } from '../cardAssets';
import type { CardType } from '../game';
export const cardAnimationConfig:Record<CardType,{name:string;message:string;color:string;image:string;symbol:string}> = {
 double:{name:'DOUBLE HIGH RISK',message:'HIGH RISK ×2',color:'#ee9773',image:CARD_ASSETS.double,symbol:'×2'},
 safe:{name:'SAFE CHOICE',message:'PROTECTED',color:'#8fd4e8',image:CARD_ASSETS.safe,symbol:'◇'},
 challenge:{name:'CHALLENGE',message:'CHALLENGE ACCEPTED',color:'#f5d77c',image:CARD_ASSETS.challenge,symbol:'ϟ'},
 steal:{name:'STEAL',message:'STEAL ACTIVATED',color:'#f4c46b',image:CARD_ASSETS.steal,symbol:'♛'},
};
export const CARD_BACK = CARD_BACK_ASSET;
export const cardAbility:Record<CardType,string> = {double:'ĐÚNG ×2 · SAI ×2',safe:'SAI KHÔNG MẤT ĐIỂM',challenge:'CHUYỂN QUYỀN TRẢ LỜI',steal:'GIÀNH QUYỀN TRẢ LỜI'};
export const ANIMATION_MS = 4000;
export function preloadCards() { return [CARD_BACK,...Object.values(cardAnimationConfig).map(c=>c.image)].map(src=>{const image=new Image();image.src=src;return image;}); }

export const RESULT_MS = 10600;
export const animationDuration = (event:import('../game').CardActivation) => event.result ? RESULT_MS : ANIMATION_MS;
