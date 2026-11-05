import type {CardType} from './game';
// One source of artwork for every game surface; changing decks never changes rules.
export const CARD_ASSETS:Record<CardType,string>={
 double:'/cards/english/double.svg',
 safe:'/cards/english/safe.svg',
 challenge:'/cards/english/challenge.svg',
 steal:'/cards/english/steal.svg',
};
export const CARD_BACK_ASSET='/cards/royal-v2/back.webp';
