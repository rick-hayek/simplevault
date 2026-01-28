
import React, { useMemo, useState } from 'react';
import { ShieldAlert, ShieldCheck, RefreshCcw, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTranslation } from 'react-i18next';
import { PasswordEntry, SecurityService } from '@premium-password-manager/core';

interface SecurityDashboardProps {
  passwords: PasswordEntry[];
  onResolve: (entryId: string) => void;
  onScan?: () => void;
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({ passwords, onResolve, onScan }) => {
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const audit = useMemo(() => {
    return SecurityService.performAudit(passwords);
  }, [passwords]);

  const chartData = [
    { name: t('security.stats.weak'), value: audit.weakCount, color: '#f43f5e' },
    { name: t('security.stats.secure_strong'), value: audit.secureCount, color: '#10b981' },
    { name: t('security.stats.other'), value: passwords.length - audit.weakCount - audit.secureCount, color: '#f59e0b' },
  ];

  const getStatusText = (score: number) => {
    if (score > 80) return t('security.status.robust');
    if (score > 50) return t('security.status.decent');
    return t('security.status.weak');
  };

  return (
    <div className="space-y-4 md:space-y-5 pb-6">
      <div className="flex items-center justify-between">
        <div className="hidden md:block">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t('security.title')}</h1>
          <p className="hidden md:block text-slate-500 dark:text-slate-400 text-xs mt-0.5">{t('security.subtitle')}</p>
        </div>
        <button
          onClick={() => {
            if (onScan) {
              setIsScanning(true);
              onScan();
              setTimeout(() => setIsScanning(false), 1000);
            }
          }}
          disabled={isScanning}
          className="hidden md:flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
        >
          <RefreshCcw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? t('security.scanning', 'SCANNING...') : t('security.scan')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="flex flex-col sm:flex-row items-center gap-8 relative">
            <div className="relative w-40 h-40 md:w-44 md:h-44 flex items-center justify-center shrink-0 p-2">
              <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="44"
                  fill="none" stroke="currentColor" strokeWidth="8"
                  className="text-slate-100 dark:text-slate-800"
                  strokeLinecap="round"
                />
                <circle
                  cx="50" cy="50" r="44"
                  fill="none" stroke="currentColor" strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 44}
                  strokeDashoffset={2 * Math.PI * 44 * (1 - audit.score / 100)}
                  strokeLinecap="round"
                  className="text-emerald-500 transition-all duration-1000 ease-out shadow-sm drop-shadow-md"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white block tracking-tighter">{audit.score}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('security.score')}</span>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('security.status.title')}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed max-w-sm mx-auto sm:mx-0 font-medium">
                  {getStatusText(audit.score)}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto sm:mx-0">
                <div className="px-3 py-3 bg-rose-50 dark:bg-rose-500/5 rounded-2xl border border-rose-100 dark:border-rose-500/10 text-center">
                  <span className="block text-xl font-black text-rose-500">{audit.weakCount}</span>
                  <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">{t('security.stats.weak')}</span>
                </div>
                <div className="px-3 py-3 bg-amber-50 dark:bg-amber-500/5 rounded-2xl border border-amber-100 dark:border-amber-500/10 text-center">
                  <span className="block text-xl font-black text-amber-500">{audit.reusedCount}</span>
                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">{t('security.stats.reused')}</span>
                </div>
                <div className="px-3 py-3 bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/10 text-center">
                  <span className="block text-xl font-black text-emerald-500">{audit.secureCount}</span>
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">{t('security.stats.safe')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[200px]">
          <div className="w-full h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none">
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full ring-2 ring-opacity-20 ring-gray-500" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('security.alerts.title')}</span>
          </div>
          <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-3 py-1 rounded-full border border-rose-100 dark:border-rose-500/20">{audit.alerts.length} {t('security.alerts.action_items')}</span>
        </div>

        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {audit.alerts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-emerald-500" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{t('security.alerts.empty_title', 'All Clear!')}</h4>
              <p className="text-xs font-medium text-slate-400 mt-1">{t('security.alerts.empty')}</p>
            </div>
          ) : (
            audit.alerts.map((alert, index) => (
              <div key={index} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-start gap-4 w-full sm:w-auto sm:flex-1 sm:min-w-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${alert.severity === 'high' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-500'
                    }`}>
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {alert.type === 'weak'
                        ? t('security.alerts.weak_title', { title: alert.entryTitle })
                        : alert.type === 'reused'
                          ? t('security.alerts.reused_title', { count: alert.count })
                          : alert.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug break-words">
                      {alert.type === 'weak'
                        ? t('security.alerts.weak_description')
                        : alert.type === 'reused'
                          ? (alert.count && alert.count > 3
                            ? t('security.alerts.reused_description_more', { titles: alert.titles })
                            : t('security.alerts.reused_description', { titles: alert.titles }))
                          : alert.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => alert.entryIds.length > 0 && onResolve(alert.entryIds[0])}
                  className="w-full sm:w-auto shrink-0 text-[10px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-5 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  {t('security.alerts.resolve')}
                </button>
              </div>
            ))
          )}
        </div>
      </div>


      <div className="md:hidden mt-6 flex justify-center">
        <button
          onClick={() => {
            if (onScan) {
              setIsScanning(true);
              onScan();
              setTimeout(() => setIsScanning(false), 1000);
            }
          }}
          disabled={isScanning}
          className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
        >
          <RefreshCcw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          <span className="uppercase tracking-wider text-xs">{isScanning ? t('security.scanning', 'SCANNING...') : t('security.scan_full', 'Run Full Scan')}</span>
        </button>
      </div>
    </div >
  );
};
