import { useEffect, useId, useRef, useState } from 'react'
import { useStore } from '../../context/StoreContext'
import { BoxIcon, PlaneIcon, ArrowIcon } from '../ui/icons'

export default function CategoryTiles() {
  const { setCategory, setQuery, go, storeCategories = [] } = useStore()
  const sections = [...storeCategories, { name: 'Pasabuy su Misura', isPasabuy: true }]

  const railRef = useRef(null)
  const dragRef = useRef(null)
  const hintId = useId()
  const [dragging, setDragging] = useState(false)
  const [canPrevious, setCanPrevious] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const updateBounds = () => {
    const rail = railRef.current
    if (!rail) return
    setCanPrevious(rail.scrollLeft > 1)
    setCanNext(rail.scrollLeft < rail.scrollWidth - rail.clientWidth - 1)
  }

  useEffect(() => {
    const rail = railRef.current
    rail.scrollTo({ left: 0, behavior: 'instant' })
    updateBounds()
    const observer = new ResizeObserver(updateBounds)
    observer.observe(rail)
    const cancelDrag = () => {
      const pointerId = dragRef.current?.pointerId
      if (pointerId != null && rail.hasPointerCapture(pointerId)) rail.releasePointerCapture(pointerId)
      dragRef.current = null
      setDragging(false)
    }
    window.addEventListener('blur', cancelDrag)
    return () => { observer.disconnect(); window.removeEventListener('blur', cancelDrag) }
  }, [sections.length])

  const move = (direction, instant = false) => {
    const rail = railRef.current
    rail.scrollBy({ left: direction * (rail.clientWidth + 12), behavior: instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  const startDrag = (event) => {
    if (event.pointerType !== 'mouse') {
      dragRef.current = null
      setDragging(false)
      return
    }
    if (event.button !== 0) return
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, moved: false }
  }
  const drag = (event) => {
    const held = dragRef.current
    if (!held || held.pointerId !== event.pointerId || event.buttons !== 1) return
    const distance = event.clientX - held.x
    if (!held.moved) {
      if (Math.abs(distance) < 6 || Math.abs(distance) <= Math.abs(event.clientY - held.y)) return
      held.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
      setDragging(true)
    }
    event.preventDefault()
    event.currentTarget.scrollLeft = held.left - distance
  }
  const finishDrag = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (dragRef.current) dragRef.current.pointerId = null
    setDragging(false)
  }

  const open = (section) => {
    if (section.isPasabuy) return go('pasabuy')
    setQuery('')
    setCategory(section.name)
    go('catalog')
  }

  return (
    <section className="store-section py-14 md:py-18" aria-label="The Italian Cabinet">
      <div className="mb-8 flex items-end justify-between gap-5 border-b border-[var(--store-surface-border)] pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-crimson">Browse By Category</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-navy md:text-4xl">
            The Cabinet
          </h2>
          <p className="mt-1.5 text-sm text-navy-soft">
            Browse the categories in our current catalog.
          </p>
        </div>
        <button
          onClick={() => go('catalog')}
          className="hidden min-h-11 items-center gap-2 text-sm font-bold text-navy transition-colors hover:text-crimson sm:flex cursor-pointer"
        >
          View all products <ArrowIcon size={15} />
        </button>
      </div>

      <div
        ref={railRef}
        role="group"
        aria-label="Cabinet categories"
        aria-describedby={hintId}
        tabIndex={0}
        onScroll={updateBounds}
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
        onClickCapture={(event) => {
          if (event.detail !== 0 && dragRef.current?.moved) {
            event.preventDefault()
            event.stopPropagation()
          }
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            move(event.key === 'ArrowLeft' ? -1 : 1, true)
          } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault()
            event.currentTarget.scrollTo({ left: event.key === 'Home' ? 0 : event.currentTarget.scrollWidth, behavior: 'instant' })
          }
        }}
        style={{ scrollbarWidth: 'thin', scrollSnapType: dragging ? 'none' : 'x mandatory' }}
        className={`flex gap-3 overflow-x-auto overscroll-x-contain pb-3 select-none rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {sections.map((section) => {
          const { name: title, count, isPasabuy } = section
          const CategoryIcon = isPasabuy ? PlaneIcon : BoxIcon

          return (
            <button
              key={isPasabuy ? 'service:pasabuy' : `category:${title}`}
              onClick={() => open(section)}
              style={{ flexBasis: 'calc((100% - 0.75rem) / 2)', scrollSnapAlign: 'start', cursor: 'inherit' }}
              className="group relative flex min-w-0 shrink-0 min-h-[10.5rem] flex-col items-start justify-between sm:min-h-[5.5rem] sm:flex-row sm:items-center rounded-xl border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] p-4 text-left shadow-[var(--store-surface-shadow)] transition-[border-color,box-shadow,transform] duration-200 hover:border-crimson/30 hover:shadow-md active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none sm:p-5"
            >
              <div className="flex w-full min-w-0 flex-1 flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-3.5">
                <span className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--store-surface-border)] bg-[var(--product-img-bg)] text-crimson transition-colors duration-150 group-hover:border-crimson/25 group-hover:bg-crimson-wash">
                  <CategoryIcon size={20} />
                </span>
                <div className="w-full min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="block text-sm sm:text-base font-semibold text-navy group-hover:text-crimson break-words">
                      {title}
                    </span>
                    {count !== undefined && count > 0 && (
                      <span className="rounded-full bg-shell px-2 py-0.5 text-xs font-bold tabular text-navy-soft">
                        {count}
                      </span>
                    )}
                    {isPasabuy && (
                      <span className="rounded-full bg-forest/10 px-2 py-0.5 text-xs font-bold text-forest">
                        Custom order
                      </span>
                    )}
                  </div>
                  <span className="mt-0.5 block text-xs text-navy-faint break-words">
                    {isPasabuy ? 'Request something from Italy' : `${count} listed product${count === 1 ? '' : 's'}`}
                  </span>
                </div>
              </div>
              <ArrowIcon
                size={15}
                className="mt-3 ml-auto sm:mt-0 sm:ml-3 shrink-0 text-navy-faint transition-transform duration-150 group-hover:translate-x-1 group-hover:text-crimson"
              />
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p id={hintId} className="text-xs text-navy-soft">Drag or swipe to browse. Use the arrows for more categories.</p>
        <div className="flex shrink-0 gap-2">
          <button type="button" aria-label="Previous categories" disabled={!canPrevious} onClick={() => move(-1)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--store-surface-border)] text-navy cursor-pointer hover:bg-crimson-wash disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-crimson">
            <ArrowIcon size={18} className="rotate-180" />
          </button>
          <button type="button" aria-label="Next categories" disabled={!canNext} onClick={() => move(1)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--store-surface-border)] text-navy cursor-pointer hover:bg-crimson-wash disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-crimson">
            <ArrowIcon size={18} />
          </button>
        </div>
      </div>
    </section>
  )
}
