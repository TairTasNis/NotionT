import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  linkWithPopup,
  unlink,
  GoogleAuthProvider,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { database } from '../lib/firebase';
import { ref, get, set, update } from 'firebase/database';
import { UserProfile } from '../types';

interface RegisterData {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (data: RegisterData) => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
  unlinkGoogleAccount: () => Promise<void>;
  updateAvatar: (avatarUrl: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (u: User) => {
    try {
      const snap = await get(ref(database, `users/${u.uid}`));
      if (snap.exists()) {
        const profile = snap.val() as UserProfile;
        // Check if Google provider is currently linked
        const hasGoogle = u.providerData.some(p => p.providerId === 'google.com');
        setUserProfile({ ...profile, linkedGoogle: hasGoogle });
      } else {
        // User signed in with Google but has no profile yet — create one
        const hasGoogle = u.providerData.some(p => p.providerId === 'google.com');
        if (hasGoogle) {
          const autoProfile: UserProfile = {
            uid: u.uid,
            email: u.email || '',
            username: u.email?.split('@')[0] || u.uid.slice(0, 8),
            firstName: u.displayName?.split(' ')[0] || '',
            lastName: u.displayName?.split(' ').slice(1).join(' ') || '',
            dateOfBirth: '',
            createdAt: Date.now(),
            linkedGoogle: true,
            avatarUrl: u.photoURL || '',
          };
          await set(ref(database, `users/${u.uid}`), autoProfile);
          await set(ref(database, `usernames/${autoProfile.username}`), u.uid);
          setUserProfile(autoProfile);
        } else {
          setUserProfile(null);
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setUserProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchProfile(u);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in with email', error);
      throw error;
    }
  };

  const signUpWithEmail = async (data: RegisterData) => {
    // Check username uniqueness first
    const usernameSnap = await get(ref(database, `usernames/${data.username}`));
    if (usernameSnap.exists()) {
      throw new Error('Этот юзернейм уже занят');
    }

    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);

    const profile: UserProfile = {
      uid: cred.user.uid,
      email: data.email,
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      createdAt: Date.now(),
      linkedGoogle: false,
    };

    await set(ref(database, `users/${cred.user.uid}`), profile);
    await set(ref(database, `usernames/${data.username}`), cred.user.uid);
    setUserProfile(profile);
  };

  const linkGoogleAccount = async () => {
    if (!user) throw new Error('Not authenticated');
    try {
      await linkWithPopup(user, new GoogleAuthProvider());
      // Refresh profile
      if (userProfile) {
        const updated = { ...userProfile, linkedGoogle: true };
        await set(ref(database, `users/${user.uid}`), updated);
        setUserProfile(updated);
      }
    } catch (error: any) {
      console.error('Error linking Google:', error);
      throw error;
    }
  };

  const unlinkGoogleAccount = async () => {
    if (!user) throw new Error('Not authenticated');
    // Only allow unlinking if user has email/password provider too
    const hasPassword = user.providerData.some(p => p.providerId === 'password');
    if (!hasPassword) {
      throw new Error('Нельзя отвязать Google — это единственный способ входа. Сначала привяжите email/пароль.');
    }
    try {
      await unlink(user, 'google.com');
      if (userProfile) {
        const updated = { ...userProfile, linkedGoogle: false };
        await set(ref(database, `users/${user.uid}`), updated);
        setUserProfile(updated);
      }
    } catch (error: any) {
      console.error('Error unlinking Google:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  const updateAvatar = async (avatarUrl: string) => {
    if (!user) throw new Error('Not authenticated');
    try {
      await updateProfile(user, { photoURL: avatarUrl });
      await update(ref(database, `users/${user.uid}`), { avatarUrl });
      // Refresh local firebase user object so photoURL updates immediately
      await user.reload();
      setUser(auth.currentUser ? { ...auth.currentUser } as User : user);
      setUserProfile((prev) => (prev ? { ...prev, avatarUrl } : prev));
    } catch (error) {
      console.error('Error updating avatar', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, linkGoogleAccount, unlinkGoogleAccount, updateAvatar, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
