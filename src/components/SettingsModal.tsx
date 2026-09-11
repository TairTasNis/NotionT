import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, User, Mail, AtSign, Calendar, Link2, Unlink } from 'lucide-react';

interface SettingsModalProps {
    open: boolean;
    onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
    const { user, userProfile, linkGoogleAccount, unlinkGoogleAccount } = useAuth();
    const [linkLoading, setLinkLoading] = useState(false);
    const [linkError, setLinkError] = useState('');
    const [linkSuccess, setLinkSuccess] = useState('');

    if (!open || !user) return null;

    const googleProvider = user.providerData.find(p => p.providerId === 'google.com');
    const hasPassword = user.providerData.some(p => p.providerId === 'password');

    const handleLinkGoogle = async () => {
        setLinkError('');
        setLinkSuccess('');
        setLinkLoading(true);
        try {
            await linkGoogleAccount();
            setLinkSuccess('Google аккаунт успешно привязан!');
        } catch (err: any) {
            if (err?.code === 'auth/credential-already-in-use') {
                setLinkError('Этот Google аккаунт уже привязан к другому пользователю');
            } else if (err?.code === 'auth/popup-closed-by-user') {
                // User closed popup, do nothing
            } else {
                setLinkError(err?.message || 'Ошибка привязки Google аккаунта');
            }
        } finally {
            setLinkLoading(false);
        }
    };

    const handleUnlinkGoogle = async () => {
        setLinkError('');
        setLinkSuccess('');
        setLinkLoading(true);
        try {
            await unlinkGoogleAccount();
            setLinkSuccess('Google аккаунт отвязан');
        } catch (err: any) {
            setLinkError(err?.message || 'Ошибка отвязки');
        } finally {
            setLinkLoading(false);
        }
    };

    const infoRow = (icon: React.ReactNode, label: string, value: string) => (
        <div className="flex items-center gap-3 py-3 border-b border-zinc-800/50 last:border-0">
            <div className="text-zinc-500 shrink-0">{icon}</div>
            <div className="min-w-0">
                <div className="text-[11px] text-zinc-500 uppercase tracking-wider">{label}</div>
                <div className="text-sm text-zinc-200 truncate">{value || '—'}</div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80]" onClick={onClose}>
            <div
                className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-[440px] max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-zinc-800">
                    <h2 className="text-lg font-semibold text-white">Настройки аккаунта</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Profile Info */}
                <div className="p-5">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Профиль</h3>
                    <div className="bg-zinc-950 rounded-xl px-4">
                        {infoRow(<User size={15} />, 'Имя', `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim())}
                        {infoRow(<AtSign size={15} />, 'Юзернейм', userProfile?.username || '')}
                        {infoRow(<Mail size={15} />, 'Email', userProfile?.email || user?.email || '')}
                        {infoRow(<Calendar size={15} />, 'Дата рождения', userProfile?.dateOfBirth
                            ? new Date(userProfile.dateOfBirth + 'T00:00:00').toLocaleDateString('ru-RU')
                            : ''
                        )}
                    </div>
                </div>

                {/* Linked Accounts */}
                <div className="p-5 pt-0">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Привязанные аккаунты</h3>

                    {linkError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg mb-3">
                            {linkError}
                        </div>
                    )}
                    {linkSuccess && (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs px-3 py-2 rounded-lg mb-3">
                            {linkSuccess}
                        </div>
                    )}

                    <div className="bg-zinc-950 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                                <div>
                                    <div className="text-sm text-white font-medium">Google</div>
                                    {googleProvider ? (
                                        <div className="text-xs text-zinc-500">{googleProvider.email}</div>
                                    ) : (
                                        <div className="text-xs text-zinc-600">Не привязан</div>
                                    )}
                                </div>
                            </div>

                            {googleProvider ? (
                                <button
                                    onClick={handleUnlinkGoogle}
                                    disabled={linkLoading || !hasPassword}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={!hasPassword ? 'Нельзя отвязать единственный способ входа' : 'Отвязать Google'}
                                >
                                    <Unlink size={13} />
                                    Отвязать
                                </button>
                            ) : (
                                <button
                                    onClick={handleLinkGoogle}
                                    disabled={linkLoading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <Link2 size={13} />
                                    Привязать
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Email/Password provider info */}
                    <div className="bg-zinc-950 rounded-xl p-4 mt-3">
                        <div className="flex items-center gap-3">
                            <Mail size={18} className="text-zinc-500" />
                            <div>
                                <div className="text-sm text-white font-medium">Email / Пароль</div>
                                {hasPassword ? (
                                    <div className="text-xs text-green-500">Активен</div>
                                ) : (
                                    <div className="text-xs text-zinc-600">Не настроен</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
