
import React, { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Copy, Check, Info, Type, Hash, Code } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CryptoService } from '@premium-password-manager/core';

export const GeneratorView: React.FC = () => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(16);
  const [copied, setCopied] = useState(false);
  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true
  });

  const generatePassword = useCallback(() => {
    const result = CryptoService.generatePassword(length, options);
    setPassword(result);
  }, [length, options]);

  useEffect(() => {
    generatePassword();
  }, [generatePassword]);

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getEntropy = () => {
    let poolSize = 0;
    if (options.uppercase) poolSize += 26;
    if (options.lowercase) poolSize += 26;
    if (options.numbers) poolSize += 10;
    if (options.symbols) poolSize += 32;
    if (poolSize === 0) return 0;
    return Math.floor(length * Math.log2(poolSize));
  };

  const CompactOption = ({ icon: Icon, label, value, onClick }: any) => (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 group-hover:text-violet-500 transition-colors">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight">{label}</span>
      </div>
      <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${value ? 'bg-violet-600' : 'bg-slate-200 dark:bg-slate-700'
        }`}>
        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${value ? 'left-[18px]' : 'left-0.5'
          }`} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="block">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{t('generator.title')}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('generator.subtitle')}</p>
        </div>
        <div className="hidden md:block px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700">
          {t('generator.entropy', { bits: getEntropy() })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Result Card */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex-1 flex flex-col justify-center min-h-[300px]">
            {/* Background Decoration */}

            <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-[32px] blur-2xl opacity-5 dark:opacity-10 pointer-events-none" />

            <div className="relative text-center space-y-8 z-10">
              <span className="text-3xl md:text-5xl font-mono font-bold text-slate-800 dark:text-white break-all tracking-tight leading-tight selection:bg-violet-500 selection:text-white block min-h-[1.2em]">
                {password}
              </span>

              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto w-full pt-4">
                <button
                  onClick={generatePassword}
                  className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-500/50 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm hover:shadow-md"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span className="uppercase tracking-wider text-xs">{t('generator.actions.regenerate', 'Regenerate')}</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="flex-1 py-4 bg-violet-600 text-white rounded-2xl font-bold shadow-lg shadow-violet-500/30 hover:bg-violet-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  <span className="uppercase tracking-wider text-xs">{copied ? t('common.copied', 'Copied') : t('common.copy', 'Copy')}</span>
                </button>
              </div>


            </div>
          </div>
        </div>

        {/* Right Column: Configuration */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col justify-center">
            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      {t('generator.length')}
                    </label>
                    <div className="md:hidden px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 w-fit">
                      {t('generator.entropy', { bits: getEntropy() })}
                    </div>
                  </div>
                  <input
                    type="number"
                    min="4"
                    max="128"
                    value={length}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) setLength(Math.min(128, Math.max(1, val)));
                    }}
                    className="text-lg font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-2xl tabular-nums w-20 text-center border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>

                <div className="h-10 flex items-center px-1">
                  <input
                    type="range" min="4" max="128" value={length}
                    onChange={(e) => setLength(parseInt(e.target.value))}
                    className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-violet-600 hover:accent-violet-500 transition-all touch-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                <CompactOption
                  icon={Type}
                  label={t('generator.options.uppercase')}
                  value={options.uppercase}
                  onClick={() => setOptions(prev => ({ ...prev, uppercase: !prev.uppercase }))}
                />
                <CompactOption
                  icon={Type}
                  label={t('generator.options.lowercase')}
                  value={options.lowercase}
                  onClick={() => setOptions(prev => ({ ...prev, lowercase: !prev.lowercase }))}
                />
                <CompactOption
                  icon={Hash}
                  label={t('generator.options.numbers')}
                  value={options.numbers}
                  onClick={() => setOptions(prev => ({ ...prev, numbers: !prev.numbers }))}
                />
                <CompactOption
                  icon={Code}
                  label={t('generator.options.symbols')}
                  value={options.symbols}
                  onClick={() => setOptions(prev => ({ ...prev, symbols: !prev.symbols }))}
                />
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-start gap-3">
                <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-full text-violet-500 shrink-0">
                  <Info className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed pt-1">
                  {t('generator.info')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
