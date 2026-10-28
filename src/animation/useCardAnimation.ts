import { useCallback, useEffect, useRef, useState } from 'react';
import type { CardActivation } from '../game';
import { animationDuration, preloadCards } from './cardAnimationConfig';
// Animation events are transient: never replay saved game snapshots or undo history.
export function useCardAnimation(presentation:boolean,practice:boolean) {
 const [event,setEvent] = useState<CardActivation|null>(null);
 const active = useRef<CardActivation|null>(null);
 const channel = useRef<BroadcastChannel|null>(null);
 const seen = useRef(new Set<string>());
 const accept = useCallback((e:CardActivation)=>{
  if (!e || typeof e.id !== 'string' || !['double','safe','challenge','steal'].includes(e.card) || seen.current.has(e.id) || Date.now()-e.at>animationDuration(e) || e.at>Date.now()+1000) return;
  seen.current.add(e.id); if(seen.current.size>100) seen.current.delete(seen.current.values().next().value!);
  active.current=e;setEvent(e);
 },[]);
 const finish = useCallback((id:string)=>{if(active.current?.id===id){active.current=null;setEvent(null);}},[]);
 const complete = useCallback((id:string)=>{finish(id);channel.current?.postMessage({type:'complete',id});},[finish]);
 const skip = useCallback(()=>{const id=active.current?.id;if(id){finish(id);channel.current?.postMessage({type:'skip',id});}},[finish]);
 const play = useCallback((e:CardActivation)=>{accept(e);channel.current?.postMessage({type:'play',event:e});},[accept]);
 useEffect(()=>{preloadCards();if(typeof BroadcastChannel==='undefined')return;
  const c=new BroadcastChannel(practice?'crown-card-practice':'crown-card-live');channel.current=c;
  c.onmessage=({data})=>{if(data?.type==='play'&&presentation)accept(data.event);if(data?.type==='skip'||(data?.type==='complete'&&!presentation))finish(data.id);};
  return()=>{channel.current=null;c.close();};
 },[practice,presentation,accept,finish]);
 useEffect(()=>{if(!event)return;const timer=setTimeout(()=>finish(event.id),Math.max(0,event.at+animationDuration(event)-Date.now()));return()=>clearTimeout(timer);},[event,finish]);
 return {event,active,play,skip,finish,complete};
}
