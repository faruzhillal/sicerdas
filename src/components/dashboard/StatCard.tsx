import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: 'indigo' | 'green' | 'amber' | 'red';
}

export default function StatCard({ label, value, icon: Icon, trend, color = 'indigo' }: StatCardProps) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:border-indigo-100 transition-all group">
      <div className="flex justify-between items-start mb-6">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", colors[color])}>
          <Icon size={28} />
        </div>
        {trend && (
          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-slate-50 text-slate-400 rounded-full border border-slate-100">
            {trend}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-[0.1em] mb-1">{label}</h3>
        <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
      </div>
    </div>
  );
}
