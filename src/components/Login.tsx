import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';

export default function Login() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <LogIn size={32} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Добро пожаловать</h1>
        <p className="text-zinc-400 mb-8">Войдите, чтобы продолжить работу с вашими проектами</p>
        
        <button
          onClick={signInWithGoogle}
          className="w-full bg-white text-black hover:bg-zinc-200 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Войти через Google
        </button>
      </div>
    </div>
  );
}
