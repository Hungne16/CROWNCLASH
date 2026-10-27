import { beforeEach, describe, expect, it, vi } from "vitest";
const mocked = vi.hoisted(() => ({snapshot:null as null|Record<string,unknown>,sets:[] as unknown[],paths:[] as string[][]}));
vi.mock("./firebase",()=>({db:{}}));
vi.mock("firebase/firestore",async original=> {
  const actual = await original<typeof import('firebase/firestore')>();
  const snapshot = () => ({exists:()=>!!mocked.snapshot,data:()=>mocked.snapshot});
  return {...actual, doc:(_db:unknown,...path:string[])=>{mocked.paths.push(path);return path;},
    getDocFromServer:async()=>snapshot(),serverTimestamp:()=>"SERVER_TIME",
    runTransaction:async (_db:unknown,run:(tx:unknown)=>unknown)=>run({get:async()=>snapshot(),set:(...args:unknown[])=>mocked.sets.push(args)})};
});
import { Timestamp } from "firebase/firestore";
import { loadPreparation, savePreparation, PreparationConflict } from "./preparationRepository";
import { emptyPreparation } from "./preparation";
beforeEach(()=>{mocked.snapshot=null;mocked.sets=[];mocked.paths=[];});
const record=(revision:number)=>({payload:emptyPreparation(),revision,updatedAt:Timestamp.fromDate(new Date('2026-10-28T00:00:00Z'))});
describe('Firestore revision protection',()=>{
  it('reads only the owner document',async()=>{mocked.snapshot=record(2);expect((await loadPreparation('a'))?.revision).toBe(2);expect(mocked.paths).toContainEqual(['adminPreparations','a']);});
  it('atomically increments the expected revision with server time',async()=>{mocked.snapshot=record(3);expect((await savePreparation('a',emptyPreparation(),3)).revision).toBe(4);expect(mocked.sets).toEqual([[['adminPreparations','a'],{payload:emptyPreparation(),revision:4,updatedAt:'SERVER_TIME'}]]);});
  it('preserves newer edits from another device',async()=>{mocked.snapshot=record(9);await expect(savePreparation('a',emptyPreparation(),3)).rejects.toBeInstanceOf(PreparationConflict);expect(mocked.sets).toHaveLength(0);});
  it('rejects simultaneous initial creation',async()=>{mocked.snapshot=record(1);await expect(savePreparation('a',emptyPreparation(),null)).rejects.toBeInstanceOf(PreparationConflict);expect(mocked.sets).toHaveLength(0);});
  it('creates the first revision',async()=>{expect((await savePreparation('a',emptyPreparation(),null)).revision).toBe(1);});
  it('rejects a deleted document instead of recreating an old revision',async()=>{await expect(savePreparation('a',emptyPreparation(),5)).rejects.toBeInstanceOf(PreparationConflict);});
});
