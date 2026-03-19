import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getUserColor(userId: string | undefined): string {
  if (!userId) return 'bg-zinc-100 text-zinc-600 border-zinc-200';
  
  const colors = [
    'bg-slate-600 text-white border-slate-700 hover:border-slate-800',
    'bg-gray-600 text-white border-gray-700 hover:border-gray-800',
    'bg-zinc-600 text-white border-zinc-700 hover:border-zinc-800',
    'bg-neutral-600 text-white border-neutral-700 hover:border-neutral-800',
    'bg-stone-600 text-white border-stone-700 hover:border-stone-800',
    'bg-amber-600 text-white border-amber-700 hover:border-amber-800',
    'bg-orange-600 text-white border-orange-700 hover:border-orange-800',
    'bg-emerald-600 text-white border-emerald-700 hover:border-emerald-800',
    'bg-teal-600 text-white border-teal-700 hover:border-teal-800',
    'bg-cyan-600 text-white border-cyan-700 hover:border-cyan-800',
    'bg-sky-600 text-white border-sky-700 hover:border-sky-800',
    'bg-blue-600 text-white border-blue-700 hover:border-blue-800',
    'bg-indigo-600 text-white border-indigo-700 hover:border-indigo-800',
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function getSafeDate(dateObj: any): Date {
  if (!dateObj) return new Date();
  if (dateObj instanceof Date) return dateObj;
  if (typeof dateObj.toDate === 'function') return dateObj.toDate();
  if (dateObj.seconds) return new Date(dateObj.seconds * 1000);
  return new Date(dateObj);
}
