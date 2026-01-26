
import React, { useState } from 'react';
import { ShieldCheck, Key, Fingerprint, ChevronRight, Lock, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WelcomeViewProps {
  onComplete: (masterKey: string, bioEnabled: boolean) => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [masterKey, setMasterKey] = useState('');
  const [confirmKey, setConfirmKey] = useState('');
  const [bioEnabled, setBioEnabled] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  const handleNext = () => {
    if (step === 1) {
      if (masterKey.length < 8) {
        setError(t('welcome.error.length'));
        return;
      }
      if (masterKey !== confirmKey) {
        setError(t('welcome.error.match'));
        return;
      }
      setError('');
      setStep(2);
    } else {
      onComplete(masterKey, bioEnabled);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Progress Bar - Reduced margin */}
        <div className="flex gap-2 mb-6 md:mb-8">
          <div className={`h-1 flex-1 rounded-full transition-all duration-700 ${step >= 1 ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-slate-800'}`} />
          <div className={`h-1 flex-1 rounded-full transition-all duration-700 ${step >= 2 ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-slate-800'}`} />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-xl animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-6 md:mb-8 text-center">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 dark:bg-white rounded-2xl md:rounded-3xl shadow-lg flex items-center justify-center mx-auto mb-4 md:mb-6 transform -rotate-3 transition-transform duration-500">
              <ShieldCheck className="w-8 h-8 md:w-10 md:h-10 text-white dark:text-slate-900" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mb-1.5 tracking-tight">
              {step === 1 ? t('welcome.step1.title') : t('welcome.step2.title')}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">
              {step === 1
                ? t('welcome.step1.subtitle')
                : t('welcome.step2.subtitle')}
            </p>
          </div>

          {step === 1 && (
            <div className="space-y-4 md:space-y-6">
              <div className="space-y-1.5">
                <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1">{t('welcome.master_key')}</label>
                <div className="relative group">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 dark:group-focus-within:text-white" />
                  <input
                    type={showKey ? "text" : "password"}
                    value={masterKey}
                    onChange={(e) => setMasterKey(e.target.value)}
                    placeholder={t('welcome.key_placeholder')}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl py-3.5 md:py-4 pl-12 pr-12 outline-none focus:border-slate-400 transition-all text-slate-900 dark:text-white font-medium text-sm md:text-base"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    {showKey ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1">{t('welcome.verify_key')}</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 dark:group-focus-within:text-white" />
                  <input
                    type={showKey ? "text" : "password"}
                    value={confirmKey}
                    onChange={(e) => setConfirmKey(e.target.value)}
                    placeholder={t('welcome.repeat_placeholder')}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl py-3.5 md:py-4 pl-12 pr-4 outline-none focus:border-slate-400 transition-all text-slate-900 dark:text-white font-medium text-sm md:text-base"
                  />
                </div>
              </div>

              {error && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider text-center animate-pulse">{error}</p>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 md:space-y-6 py-1">
              <div
                onClick={() => setBioEnabled(!bioEnabled)}
                className={`p-4 md:p-6 rounded-[1.5rem] md:rounded-3xl border-2 transition-all cursor-pointer flex items-center gap-4 md:gap-6 ${bioEnabled
                  ? 'border-slate-900 bg-slate-50 dark:border-white dark:bg-white/5'
                  : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'
                  }`}
              >
                <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${bioEnabled ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  <Fingerprint className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <div className="flex-1">
                  <h4 className={`font-bold text-base md:text-lg transition-colors ${bioEnabled ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{t('welcome.biometric')}</h4>
                  <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium italic">{t('welcome.biometric_subtitle')}</p>
                </div>
                <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center transition-all ${bioEnabled ? 'bg-slate-900 border-slate-900 dark:bg-white dark:border-white' : 'border-slate-200 dark:border-slate-700'}`}>
                  {bioEnabled && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-900" />}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleNext}
            className="w-full mt-6 md:mt-10 flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold text-sm md:text-base shadow-xl transition-all active:scale-[0.98] hover:opacity-90"
          >
            {step === 1 ? t('welcome.next') : t('welcome.start')}
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
