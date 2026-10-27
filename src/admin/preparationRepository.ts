import { doc, getDocFromServer, runTransaction, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { parsePreparation, type Preparation } from "./preparation";
export type SavedPreparation = {payload:Preparation;revision:number;updatedAt:string};
export class PreparationConflict extends Error {
  constructor(public latest:SavedPreparation|null) { super("Bộ đề đã được thay đổi trên máy khác. Hãy chọn bản muốn giữ."); }
}
export function parseRecord(value: Record<string,unknown>): SavedPreparation {
  if (typeof value.revision !== "number" || !Number.isSafeInteger(value.revision) || value.revision < 1 || !(value.updatedAt instanceof Timestamp)) throw new Error("Phiên bản bộ đề không hợp lệ.");
  return {payload:parsePreparation(value.payload), revision:value.revision,updatedAt:value.updatedAt.toDate().toISOString()};
}
export async function loadPreparation(ownerId:string):Promise<SavedPreparation|null> {
  if (!db) throw new Error("Tài khoản chưa được kết nối.");
  const snapshot = await getDocFromServer(doc(db,"adminPreparations",ownerId));
  return snapshot.exists() ? parseRecord(snapshot.data()) : null;
}
export async function savePreparation(ownerId:string,payload:Preparation,revision:number|null):Promise<SavedPreparation> {
  if (!db) throw new Error("Tài khoản chưa được kết nối.");
  const clean = parsePreparation(payload);
  const ref = doc(db,"adminPreparations",ownerId);
  return runTransaction(db,async transaction => {
    const snapshot = await transaction.get(ref);
    const latest = snapshot.exists() ? parseRecord(snapshot.data()) : null;
    if ((latest?.revision ?? null) !== revision) throw new PreparationConflict(latest);
    const nextRevision = (revision ?? 0) + 1;
    transaction.set(ref,{payload:clean,revision:nextRevision,updatedAt:serverTimestamp()});
    // Return this commit's payload; a subsequent read could belong to another device.
    return {payload:clean,revision:nextRevision,updatedAt:new Date().toISOString()};
  });
}
