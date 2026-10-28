export const field='store-field mt-2 min-h-12 w-full px-4 text-base'
export const primary='inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-crimson px-5 text-sm font-bold text-paper transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'
export const secondary='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-paper px-4 text-sm font-bold text-navy transition-[transform,border-color] duration-150 hover:border-navy/25 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50'
export function formatDate(value) {
 const date=value?new Date(value):null
 return !date||Number.isNaN(date.getTime())?'Date unavailable':new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeZone:'Asia/Manila'}).format(date)
}
export const peso=value=>value===null||value===undefined?'Amount unavailable':new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:2}).format(Number(value))
