// Minimal inline icon set — 1.5px stroke, matches Archivo's utilitarian weight.

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const Icon = ({ d, size = 18, className = '', children }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    {...base}
  >
    {d ? <path d={d} /> : children}
  </svg>
)

export const SearchIcon = (p) => (
  <Icon {...p} d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35" />
)

export const BagIcon = (p) => (
  <Icon {...p} d="M6 7h12l1 14H5L6 7Zm3 3V6a3 3 0 0 1 6 0v4" />
)

export const ChatIcon = (p) => (
  <Icon
    {...p}
    d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z"
  />
)

export const CheckIcon = (p) => <Icon {...p} d="M4 12.5 9.5 18 20 6.5" />

export const ShieldIcon = (p) => (
  <Icon {...p} d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Zm-3 9 2.2 2.2L15 10.5" />
)

export const StarIcon = ({ size = 14, className = '' }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 2.5 15 9l7 .7-5.3 4.7 1.6 6.9L12 17.8l-6.3 3.5 1.6-6.9L2 9.7 9 9l3-6.5Z" />
  </svg>
)

export const PlaneIcon = (p) => (
  <Icon {...p} d="M2 12h7l3-8 2 8h8l-8 4 1 6-5-5-6 3 2-6-4-2Z" />
)

export const BoxIcon = (p) => (
  <Icon {...p} d="M3 8l9-4.5L21 8v8l-9 4.5L3 16V8Zm9 4.5L3 8m9 4.5L21 8m-9 4.5V21" />
)

export const GridIcon = (p) => (
  <Icon {...p} d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" />
)

export const UserIcon = (p) => (
  <Icon {...p} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0" />
)

export const AlertIcon = (p) => (
  <Icon {...p} d="M12 4 2 20h20L12 4Zm0 6v4m0 3v.5" />
)

export const SyncIcon = (p) => (
  <Icon {...p} d="M21 8a9 9 0 0 0-15.5-2.5L3 8m0-5v5h5m-5 8a9 9 0 0 0 15.5 2.5L21 16m0 5v-5h-5" />
)

export const XIcon = (p) => <Icon {...p} d="M5 5l14 14M19 5 5 19" />

export const MinusIcon = (p) => <Icon {...p} d="M5 12h14" />

export const PlusIcon = (p) => <Icon {...p} d="M12 5v14M5 12h14" />

export const ArrowIcon = (p) => <Icon {...p} d="M4 12h16m-6-6 6 6-6 6" />

export const GlobeIcon = (p) => (
  <Icon {...p} d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 0c2.5 2.5 4 6 4 10s-1.5 7.5-4 10m0-20c-2.5 2.5-4 6-4 10s1.5 7.5 4 10M2 12h20" />
)

export const InboxIcon = (p) => (
  <Icon {...p} d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6" />
)

export const MoonIcon = (p) => (
  <Icon {...p} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
)

export const SunIcon = (p) => (
  <Icon {...p} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36-7.36l-.71.71M6.34 17.66l-.71.71m12.02 0l-.71-.71M6.34 6.34l-.71-.71M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
)
