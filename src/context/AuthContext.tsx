
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  type User,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, updateDoc, collection, query, where, limit, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

export type UserRole = 'admin' | 'vendedor';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,    setUser]    = useState<User | null>(null);
  const [role,    setRole]    = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const snap    = await getDoc(userRef);

        if (snap.exists()) {
          const existingRole = (snap.data().role as UserRole) ?? 'vendedor';

          // If this user is vendedor, check if there's ANY admin in the system.
          // If no admin exists yet, promote this user to admin (first-run bootstrap).
          if (existingRole === 'vendedor') {
            const adminSnap = await getDocs(
              query(collection(db, 'users'), where('role', '==', 'admin'), limit(1))
            );
            if (adminSnap.empty) {
              await updateDoc(userRef, { role: 'admin' });
              setRole('admin');
            } else {
              setRole('vendedor');
            }
          } else {
            setRole(existingRole);
          }
        } else {
          // First login ever for this user — check if any admin exists
          const adminSnap = await getDocs(
            query(collection(db, 'users'), where('role', '==', 'admin'), limit(1))
          );
          const assignedRole: UserRole = adminSnap.empty ? 'admin' : 'vendedor';

          await setDoc(userRef, {
            uid:       currentUser.uid,
            email:     currentUser.email,
            role:      assignedRole,
            createdAt: serverTimestamp(),
          });
          setRole(assignedRole);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
