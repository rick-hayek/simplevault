
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
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white">{t('generator.title')}</h1>
        <div className="px-3 py-1 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-violet-100 dark:border-violet-500/20">
          {t('generator.entropy', { bits: getEntropy() })}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative group mb-6 md:mb-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl blur opacity-10 group-hover:opacity-25 transition-opacity duration-500" />
          <div className="relative flex items-center bg-slate-50 dark:bg-slate-950 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="flex-1 text-lg md:text-2xl font-mono font-bold text-slate-700 dark:text-violet-400 overflow-hidden text-ellipsis whitespace-nowrap tracking-wider">
              {password}
            </span>
            <div className="flex gap-1 md:gap-2 ml-2">
              <button onClick={generatePassword} className="p-2 text-slate-400 hover:text-violet-600 transition-colors active:scale-90"><RefreshCw className="w-5 h-5" /></button>
              <button onClick={handleCopy} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors active:scale-90">{copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}</button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-3 px-1">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{t('generator.length')}</label>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{t('generator.chars', { count: length })}</span>
            </div>
            <input
              type="range" min="8" max="64" value={length}
              onChange={(e) => setLength(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-violet-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <Info className="w-4 h-4 text-violet-400 shrink-0" />
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold leading-tight">
              {t('generator.info')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
