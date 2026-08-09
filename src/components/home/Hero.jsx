import { motion } from 'motion/react'
import { useStore } from '../../context/StoreContext'
import { RedButton, GhostButton, Kicker } from '../ui/bits'
import { ArrowIcon, CheckIcon, PlaneIcon, ShieldIcon, GridIcon } from '../ui/icons'
import FlightMap from './FlightMap'

const reveal = {
  hidden: { opacity: 0, transform: 'translateY(10px)' },
  visible: { opacity: 1, transform: 'translateY(0)', transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
}

function Hero() {
  const { go } = useStore()

  return (
    <section className="store-atmosphere relative overflow-hidden border-b border-line">
      <div className="store-section grid min-h-[36rem] items-center gap-10 py-14 md:grid-cols-[1.05fr_0.95fr] md:py-20 lg:min-h-[42rem] lg:gap-16">
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.06 } } }} className="max-w-2xl">
          <motion.div variants={reveal}>
            <Kicker className="flex items-center gap-2"><PlaneIcon size={14} /> Direct Italian sourcing · Manila fulfillment</Kicker>
          </motion.div>
          <motion.h1 variants={reveal} className="mt-5 max-w-3xl font-serif text-5xl font-semibold leading-[0.98] tracking-[-0.04em] text-navy sm:text-6xl lg:text-[4.6rem]">
            Italy, chosen well.<br /><em className="font-normal text-crimson">Delivered to Manila.</em>
          </motion.h1>
          <motion.p variants={reveal} className="mt-6 max-w-xl text-base leading-7 text-navy-soft sm:text-lg">
            Shop reviewed Italian imports already in our catalog, or ask K2 to source the exact item you need through Pasabuy. Every request is checked by a person before commitment.
          </motion.p>
          <motion.div variants={reveal} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <RedButton onClick={() => go('catalog')} className="px-7">Shop the Drop <ArrowIcon size={16} /></RedButton>
            <GhostButton onClick={() => go('pasabuy')} className="px-7">Request from Italy</GhostButton>
          </motion.div>
          <motion.p variants={reveal} className="mt-5 flex items-center gap-2 text-xs font-semibold text-navy-faint">
            <ShieldIcon size={15} className="text-forest" /> No online payment is collected at request submission.
          </motion.p>
        </motion.div>

        <motion.div initial={{ opacity: 0, transform: 'translateX(14px)' }} animate={{ opacity: 1, transform: 'translateX(0)' }} transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }} className="relative">
          <div className="store-panel overflow-hidden p-5 sm:p-7">
            <div className="mb-2 flex items-center justify-between gap-4 border-b border-[var(--store-surface-border)] pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-navy-faint">Sourcing route</p>
                <p className="mt-1 font-serif text-lg font-semibold text-navy">Milano to Manila</p>
              </div>
              <span className="rounded-md border border-gold/30 bg-gold-wash px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-gold-deep">Direct consignment</span>
            </div>
            <FlightMap />
            <div className="grid grid-cols-2 gap-3 border-t border-[var(--store-surface-border)] pt-4 text-xs">
              <p><span className="block font-bold text-navy">Reviewed catalog</span><span className="text-navy-faint">Published details checked</span></p>
              <p><span className="block font-bold text-navy">Human confirmation</span><span className="text-navy-faint">Before payment or purchase</span></p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function TrustRow() {
  const items = [
    [CheckIcon, 'Reviewed Italy-sourced catalog'],
    [PlaneIcon, 'Italy-to-Manila operations'],
    [GridIcon, 'Website, Shopee, TikTok & Lazada'],
    [ShieldIcon, 'Staff-confirmed requests'],
  ]

  return (
    <div className="store-atmosphere-soft border-b border-line">
      <div className="store-section grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
        {items.map(([ItemIcon, label]) => (
          <div key={label} className="flex min-h-16 items-center justify-center gap-2 px-3 py-3 text-center text-xs font-semibold leading-tight text-navy-soft sm:text-xs">
            <ItemIcon size={15} className="shrink-0 text-crimson" /> {label}
          </div>
        ))}
      </div>
    </div>
  )
}

export { Hero as default, TrustRow }
