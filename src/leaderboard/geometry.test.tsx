import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {initialGame} from '../game';
import {BannerLeaderboard} from './BannerLeaderboard';
import {coverTransform,DEFAULT_LAYOUT,validLayout,bannerRanking,FLAGS} from './geometry';
describe('video-coordinate banner leaderboard',()=>{
 it('applies the same centered cover scale and crop as the video',()=>{
  expect(coverTransform(1920,1080)).toEqual({scale:1.5,x:0,y:0});
  expect(coverTransform(1024,768)).toEqual({scale:768/720,x:(1024-1280*768/720)/2,y:0});
  expect(coverTransform(1600,720)).toEqual({scale:1.25,x:0,y:-90});
 });
 it('keeps source-measured text regions valid and rejects malformed imported configurations',()=>{
  expect(validLayout(DEFAULT_LAYOUT)).toBe(true);
  expect(validLayout({...DEFAULT_LAYOUT,red:{...DEFAULT_LAYOUT.red,width:0}})).toBe(false);
  expect(validLayout({...DEFAULT_LAYOUT,red:{...DEFAULT_LAYOUT.red,centerX:2}})).toBe(false);
  expect(validLayout({...DEFAULT_LAYOUT,red:{...DEFAULT_LAYOUT.red,scale:Infinity}})).toBe(false);
 });
 it('maps physical flags to score order, rather than team order',()=>{
  const game=initialGame();game.teams.forEach((t,i)=>{t.score=[-10,200,50,120][i];});
  const ranking=bannerRanking(game);
  expect(FLAGS.map(f=>ranking[f.rank-1].index)).toEqual([0,3,1,2]);
  game.teams[0].score=300;
  expect(bannerRanking(game)[0].index).toBe(0);
 });
 it('renders only ink and video on audience screens, without editor controls or cards',()=>{
  const html=renderToStaticMarkup(<BannerLeaderboard game={initialGame()}/>);
  expect(html).toContain('banner-hall.mp4');
  expect(html).not.toContain('<button');
  expect(html).not.toContain('bannerEditorPanel');
  expect(html).not.toContain('bannerDebugLabel');
  expect(html.match(/data-banner=/g)).toHaveLength(4);
 });
});
