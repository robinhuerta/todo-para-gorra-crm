
import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  type DocumentData,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

export function useFirestore<T extends DocumentData>(collectionPath: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, collectionPath));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const result: T[] = [];
      snapshot.forEach((doc) => {
        result.push({ id: doc.id, ...doc.data() } as unknown as T);
      });
      setData(result);
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionPath]);

  const add = async (item: Omit<T, 'id'>) => {
    return await addDoc(collection(db, collectionPath), {
      ...item,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const update = async (id: string, item: Partial<T>) => {
    const docRef = doc(db, collectionPath, id);
    return await updateDoc(docRef, {
      ...item,
      updatedAt: serverTimestamp(),
    });
  };

  const remove = async (id: string) => {
    const docRef = doc(db, collectionPath, id);
    return await deleteDoc(docRef);
  };

  return { data, loading, error, add, update, remove };
}
