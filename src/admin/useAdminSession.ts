import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { firebaseAuth, db, accountError } from "./firebase";
export function useAdminSession(initialRecovery = false) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!firebaseAuth);
  const [error, setError] = useState("");
  const [membership, setMembership] = useState<{user_id:string;display_name:string}|null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string|null>(null);
  const [recovery, setRecovery] = useState(initialRecovery);
  useEffect(() => {
    if (!firebaseAuth) return;
    return onAuthStateChanged(firebaseAuth, next => {
      setUser(next); setLoading(false); setError("");
    }, e => {setError(accountError(e));setLoading(false);});
  }, []);
  useEffect(() => {
    setMembership(null);setResolvedUserId(null);
    if (!user || !db) return;
    return onSnapshot(doc(db,"admins",user.uid), snapshot => {
      const data = snapshot.data();
      setMembership(data?.active === true ? {user_id:user.uid,display_name:typeof data.displayName === "string" ? data.displayName : user.email ?? "Admin"} : null);
      setResolvedUserId(user.uid);setError("");
    }, e => {setError(accountError(e));setResolvedUserId(user.uid);});
  }, [user?.uid]);
  return {
    session: user ? {user:{id:user.uid,email:user.email}} : null,
    loading, checking:!!user && resolvedUserId !== user.uid,
    membership:membership?.user_id === user?.uid ? membership : null,
    error,recovery,setRecovery,
  };
}
