import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties,type PointerEvent} from 'react';
import gsap from 'gsap';
import type {Game} from '../game';
import {useGame} from '../useGame';
import {bannerRanking,coverTransform,DEFAULT_LAYOUT,FLAGS,LAYOUT_KEY,readLayout,validLayout,VIDEO,type BannerId,type Layout,type Region} from './geometry';
import './banners.css';

function BannerText({name,score,rank,region,champion}:{name:string;score:number;rank:number;region:Region;champion:boolean}){
  const root=useRef<HTMLDivElement>(null),inner=useRef<HTMLDivElement>(null),teamName=useRef<HTMLElement>(null);
  const [fitted,setFitted]=useState(1);
  const signature=`${name}:${score}:${rank}`;
  const base=Math.min(region.height*VIDEO.height/3.8,champion?20:16)*region.scale;
  useLayoutEffect(()=>{
    if(!root.current||!inner.current)return;
    const fit=()=>{
      const box=root.current!,content=inner.current!;
      if(teamName.current){
        const label=teamName.current;
        const available=Math.max(5,Math.min(base*region.lineHeight*2,box.clientHeight-base*(1.45+.65*region.lineHeight+.12)));
        let font=base;label.style.fontSize=`${font}px`;
        while(font>4&&(label.scrollHeight>available||label.scrollWidth>box.clientWidth)){font*=.92;label.style.fontSize=`${font}px`;}
      }
      setFitted(Math.min(1,box.clientWidth/Math.max(1,content.scrollWidth),box.clientHeight/Math.max(1,content.scrollHeight)));
    };
    fit();const observer=new ResizeObserver(fit);observer.observe(root.current);observer.observe(inner.current);
    return()=>observer.disconnect();
  },[signature,region.width,region.height,region.scale,region.lineHeight]);
  useEffect(()=>{
    const ctx=gsap.context(()=>{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)gsap.fromTo(root.current,{opacity:0},{opacity:1,duration:.45,ease:'power1.out'});},root);
    return()=>ctx.revert();
  },[signature]);
  return <div ref={root} className={`bannerInk ${champion?'bannerInkChampion':''}`} aria-label={`TOP ${rank}: ${name}, ${score} points`}>
    <div ref={inner} className="bannerInkContent" style={{fontSize:base,lineHeight:region.lineHeight,transform:`scale(${fitted})`}}>
      <strong ref={teamName} className="bannerTeam">{name}</strong><b className="bannerScore">{score}</b><span className="bannerPlace">TOP {rank}</span>
    </div>
  </div>;
}

export function BannerLeaderboard({game,editor=false}:{game:Game;editor?:boolean}){
  const host=useRef<HTMLDivElement>(null),video=useRef<HTMLVideoElement>(null),file=useRef<HTMLInputElement>(null);
  const [layout,setLayout]=useState<Layout>(readLayout),[saved,setSaved]=useState<Layout>(readLayout);
  const [selected,setSelected]=useState<BannerId>('purple'),[debug,setDebug]=useState(true),[paused,setPaused]=useState(false),[time,setTime]=useState(0),[duration,setDuration]=useState(10),[notice,setNotice]=useState(''),[editing,setEditing]=useState(editor);
  const [size,setSize]=useState({width:1280,height:720}),[mediaError,setMediaError]=useState(false);
  const drag=useRef<{id:BannerId;x:number;y:number;original:Region;resize:boolean}|null>(null);
  const transform=coverTransform(size.width,size.height),ranks=bannerRanking(game),region=layout[selected];
  const dirty=JSON.stringify(saved)!==JSON.stringify(layout);
  useEffect(()=>{
    if(!host.current)return;
    const ob=new ResizeObserver(([entry])=>setSize({width:entry.contentRect.width,height:entry.contentRect.height}));ob.observe(host.current);return()=>ob.disconnect();
  },[]);
  useEffect(()=>{
    const receive=(e:StorageEvent)=>{if(e.key===LAYOUT_KEY&&!editing){const next=readLayout();setLayout(next);setSaved(next);}};
    window.addEventListener('storage',receive);return()=>window.removeEventListener('storage',receive);
  },[editing]);
  useEffect(()=>{
    if(!video.current)return;
    if(paused)video.current.pause();else void video.current.play().catch(()=>setPaused(true));
  },[paused]);
  useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  const change=(patch:Partial<Region>)=>setLayout(old=>{
    const next={...old,[selected]:{...old[selected],...patch}};return validLayout(next)?next:old;
  });
  const pointerDown=(e:PointerEvent<HTMLDivElement>,id:BannerId,resize=false)=>{
    if(!editing)return;e.preventDefault();e.stopPropagation();setSelected(id);e.currentTarget.setPointerCapture(e.pointerId);
    drag.current={id,x:e.clientX,y:e.clientY,original:{...layout[id]},resize};
  };
  const pointerMove=(e:PointerEvent<HTMLDivElement>)=>{
    const d=drag.current;if(!d)return;
    const dx=(e.clientX-d.x)/transform.scale,dy=(e.clientY-d.y)/transform.scale;
    const angle=d.original.rotation*Math.PI/180;
    const next=d.resize?{...d.original,width:Math.max(.01,Math.min(.4,d.original.width+2*(dx*Math.cos(angle)+dy*Math.sin(angle))/VIDEO.width)),height:Math.max(.02,Math.min(.4,d.original.height+2*(-dx*Math.sin(angle)+dy*Math.cos(angle))/VIDEO.height))}:
      {...d.original,centerX:Math.max(d.original.width/2,Math.min(1-d.original.width/2,d.original.centerX+dx/VIDEO.width)),centerY:Math.max(d.original.height/2,Math.min(1-d.original.height/2,d.original.centerY+dy/VIDEO.height))};
    setLayout(old=>{const updated={...old,[d.id]:next};return validLayout(updated)?updated:old;});
  };
  const save=()=>{try{localStorage.setItem(LAYOUT_KEY,JSON.stringify(layout));setSaved(structuredClone(layout));setNotice('Layout saved and sent to the audience screen.');return true;}catch{setNotice('Could not save. Export the layout as JSON to keep a copy.');return false;}};
  const exportLayout=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(layout,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='crown-banner-layout.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  return <div ref={host} className={`bannerHall ${editing?'bannerEditing':''}`}>
    <video ref={video} className="bannerVideo" src={VIDEO.src} poster="/video/banner-hall-poster.jpg" muted loop autoPlay playsInline preload="auto" onLoadedMetadata={()=>{setDuration(video.current?.duration||10);}} onTimeUpdate={()=>{if(editing)setTime(video.current?.currentTime||0);}} onError={()=>setMediaError(true)}/>
    <div className="bannerCoordinatePlane" style={{width:VIDEO.width,height:VIDEO.height,transform:`translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`}}>
      {FLAGS.map(flag=>{const r=layout[flag.id],entry=ranks[flag.rank-1];return <div key={flag.id} data-banner={flag.id} className={`bannerRegion ${editing&&debug?'bannerDebug':''} ${editing&&selected===flag.id?'bannerSelected':''}`} style={{left:r.centerX*VIDEO.width,top:r.centerY*VIDEO.height,width:r.width*VIDEO.width,height:r.height*VIDEO.height,transform:`translate(-50%,-50%) rotate(${r.rotation}deg)`} as CSSProperties} onPointerDown={e=>pointerDown(e,flag.id)} onPointerMove={pointerMove} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
        {entry&&<BannerText name={entry.team.name} score={entry.team.score} rank={flag.rank} region={r} champion={flag.rank===1}/>}
        {editing&&debug&&<><span className="bannerDebugLabel">{flag.label}</span><div role="button" aria-label={`Resize ${flag.label}`} className="bannerResize" onPointerDown={e=>pointerDown(e,flag.id,true)} onPointerMove={pointerMove} onPointerUp={e=>{e.stopPropagation();drag.current=null;}}/></>}
      </div>;})}
    </div>
    {editing&&<section className="bannerEditorPanel" aria-label="Edit Overlay">
      <div className="bannerEditorHeading"><b>Edit Overlay</b><span>1280 × 720 · normalized coordinates · {dirty?'Unsaved':'Saved'}</span><button onClick={()=>{if(dirty&&!save())return;setEditing(false);setPaused(false);}}>Save & Exit</button></div>
      <div className="bannerEditorFields">
        <label>Banner<select value={selected} onChange={e=>setSelected(e.target.value as BannerId)}>{FLAGS.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
        {([['centerX','Center X',0,1,.001],['centerY','Center Y',0,1,.001],['width','Width',.01,.4,.001],['height','Height',.02,.4,.001],['scale','Text Size',.3,3,.05],['rotation','Rotation',-30,30,.5],['lineHeight','Line Spacing',.8,2,.05]] as const).map(([key,label,min,max,step])=><label key={key}>{label}<input type="number" aria-label={label} value={Number(region[key].toFixed(4))} min={min} max={max} step={step} onChange={e=>change({[key]:Number(e.target.value)})}/></label>)}
      </div>
      <div className="bannerEditorActions">
        <button onClick={()=>setPaused(!paused)}>{paused?'Play Video':'Pause video'}</button><input aria-label="Video Frame" type="range" min={0} max={duration} step={1/24} value={time} onChange={e=>{setPaused(true);const t=Number(e.target.value);setTime(t);if(video.current)video.current.currentTime=t;}}/><span>{time.toFixed(2)}s</span>
        <label><input type="checkbox" checked={debug} onChange={e=>setDebug(e.target.checked)}/>Show Guides</label>
        <button onClick={save}>Save Layout</button><button onClick={exportLayout}>Export JSON</button><button onClick={()=>file.current?.click()}>Import JSON</button>
        <button onClick={()=>{setLayout(structuredClone(DEFAULT_LAYOUT));setNotice('Default layout restored. Save to apply it.');}}>Reset Layout</button>
      </div>
      <input ref={file} type="file" accept="application/json" hidden onChange={async e=>{try{const f=e.target.files?.[0];if(!f)return;const parsed=JSON.parse(await f.text());if(!validLayout(parsed))throw Error();setLayout(parsed);setNotice('Layout imported. Save to apply it.');}catch{setNotice('Invalid layout file.');}e.target.value='';}}/>
      <p role="status">{mediaError?'Video unavailable. Showing a still frame. ':''}{notice||'Drag text to move it or drag a corner to resize. Export JSON to use the layout on another device.'}</p>
    </section>}
  </div>;
}

export function LeaderboardPage(){
  const params=new URLSearchParams(location.search);
  const {game}=useGame(true,params.get('practice')==='1');
  return <BannerLeaderboard game={game} editor={params.get('edit')==='1'}/>;
}
