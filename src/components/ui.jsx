export function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

export const ui = {
  input: 'min-h-10 w-full min-w-0 rounded-lg border border-[#d9e2ea] bg-white px-3 text-mp-strong outline-none',
  textarea: 'min-h-[78px] w-full min-w-0 rounded-lg border border-[#d9e2ea] bg-white px-3 py-2.5 text-mp-strong outline-none resize-y',
  label: 'grid min-w-0 gap-[5px] text-xs font-extrabold uppercase text-[#64748b]',
  primaryButton: 'inline-flex min-h-10 items-center justify-center rounded-lg bg-mp-blue-700 px-4 font-bold text-white transition hover:bg-mp-blue-900 disabled:cursor-not-allowed disabled:opacity-70',
  secondaryButton: 'inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg border border-[#d7e1ea] bg-white px-3 py-2 font-bold text-slate-600 transition hover:border-sky-200 hover:bg-[#f3f7ff] hover:text-[#2563eb] disabled:cursor-not-allowed disabled:opacity-70',
  iconButton: 'inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d7e1ea] bg-white text-slate-600 transition hover:border-sky-200 hover:bg-[#f3f7ff] hover:text-[#2563eb]',
  panel: 'rounded-lg border border-mp-line bg-white p-3.5 shadow-[0_2px_10px_rgba(16,24,40,0.04)]',
  barePanel: 'rounded-lg border border-mp-line bg-white p-3.5',
  subPanel: 'rounded-lg border border-[#edf2f7] bg-[#fbfdff]',
  message: 'my-2.5 rounded-lg border border-[#f8c9c4] bg-[#fff4f2] px-3 py-2.5 font-semibold text-[#b42318]',
  warning: 'my-2.5 rounded-lg border border-[#f8d9a8] bg-[#fff8ec] px-3 py-2.5 text-[13px] font-bold text-[#9a5b00]',
  empty: 'p-4 text-center text-[#7a8798]',
  sectionTitle: 'font-extrabold text-mp-strong',
  sectionSubtitle: 'text-xs text-[#64748b]',
}

export function statusPillClasses(value) {
  const key = String(value || '').toLowerCase().replaceAll('_', '-').replace(/\s+/g, '-')

  const tone = (() => {
    if (['active', 'completed', 'closed', 'checked-out'].includes(key)) {
      return 'bg-[#e7f7ef] text-[#047857]'
    }

    if (['cancelled', 'no-show', 'voided', 'stopped', 'inactive', 'denied'].includes(key)) {
      return 'bg-[#fff1f0] text-[#b42318]'
    }

    if (['ordered', 'scheduled', 'sent', 'routine', 'ready-to-bill', 'submitted'].includes(key)) {
      return 'bg-[#eef5ff] text-[#2563eb]'
    }

    if (['draft', 'charge-entry', 'coding-review', 'follow-up'].includes(key)) {
      return 'bg-[#fff8ec] text-[#9a5b00]'
    }

    return 'bg-[#eef2f7] text-[#475569]'
  })()

  return cn(
    'inline-flex min-h-[22px] items-center rounded-full px-2 py-[3px] text-[11px] font-extrabold uppercase',
    tone,
  )
}
