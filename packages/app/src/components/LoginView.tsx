
import React, { useState } from 'react';
import { ShieldCheck, Lock, Fingerprint, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BiometricService } from '../utils/BiometricService';

interface LoginViewProps {
  onLogin: (masterKey: string) => Promise<boolean> | boolean;
  bioEnabled: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, bioEnabled }) => {
  const { t } = useTranslation();
  const [key, setKey] = useState('');
  const [error, setError] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isBioLoading, setIsBioLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const success = await onLogin(key);
    if (!success) {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  const handleBioAuth = async () => {
    setIsBioLoading(true);
    try {
      const secret = await BiometricService.retrieveSecret();
      if (secret) {
        const success = await onLogin(secret);
        if (!success) {
          setError(true);
          setTimeout(() => setError(false), 2000);
        }
      }
    } catch (e) {
      console.error('Bio auth failed', e);
      setError(true);
    } finally {
      setIsBioLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden titlebar">
      <div className="max-w-md w-full relative z-10 text-center no-drag">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 dark:bg-white rounded-2xl md:rounded-3xl shadow-2xl flex items-center justify-center mx-auto mb-6 md:mb-8 transform -rotate-3 transition-transform duration-500">
          <ShieldCheck className="w-8 h-8 md:w-10 md:h-10 text-white dark:text-slate-900" />
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-1.5 tracking-tighter">EtherVault</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6 md:mb-10 text-[10px] md:text-xs font-bold uppercase tracking-widest">{t('login.locked_local_db')}</p>

        <div className={`bg-white dark:bg-slate-900 border ${error ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'} rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-xl transition-all duration-300`}>
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div className="space-y-1.5 text-left">
              <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1">{t('login.master_password')}</label>
              <div className="relative group">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${error ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-slate-900 dark:group-focus-within:text-white'}`} />
                <input
                  type={showKey ? "text" : "password"}
                  value={key}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^[\x21-\x7E]*$/.test(val)) {
                      setKey(val);
                    }
                  }}
                  placeholder={t('login.unlock_placeholder')}
                  autoFocus
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl py-3.5 md:py-4 pl-12 pr-12 outline-none focus:border-slate-400 transition-all text-slate-900 dark:text-white font-medium text-center tracking-widest text-sm md:text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
              </div>
              {error && <p className="text-rose-500 text-[9px] font-bold uppercase tracking-wider text-center mt-2">{t('login.invalid_key')}</p>}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold text-sm md:text-base shadow-xl transition-all active:scale-[0.98] hover:opacity-90"
            >
              {t('login.access_vault')}
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </form>

          {bioEnabled && (
            <>
              <div className="flex items-center gap-3 md:gap-4 my-6 md:my-8">
                <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800" />
                <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">{t('login.secure_id')}</span>
                <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800" />
              </div>

              <button
                onClick={handleBioAuth}
                disabled={isBioLoading}
                className="w-full flex items-center justify-center gap-3 py-3 md:py-4 rounded-xl md:rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-500 text-slate-900 dark:text-white font-bold text-sm md:text-base transition-all active:scale-[0.98] group"
              >
                <Fingerprint className={`w-5 h-5 md:w-6 md:h-6 ${isBioLoading ? 'animate-pulse' : ''}`} />
                {isBioLoading ? t('login.system_auth') : t('login.unlock_bio')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
