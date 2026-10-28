import type {CardType} from './game';
// One source of artwork for every game surface; changing decks never changes rules.
export const CARD_ASSETS:Record<CardType,string>={
 double:'/cards/royal-v2/double.webp',
 safe:'/cards/royal-v2/safe.webp',
 challenge:'/cards/royal-v2/challenge.webp',
 steal:'/cards/royal-v2/steal.webp',
};
export const CARD_BACK_ASSET='/cards/royal-v2/back.webp';
