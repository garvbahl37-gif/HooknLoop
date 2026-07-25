import { useState, useMemo } from 'react'

export const SORTS = [
  ['featured', 'Featured'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['rating', 'Top rated'],
  ['name', 'Name: A–Z'],
]

/* colour name → swatch fill */
export const SWATCH = {
  black: '#1a1a1a', white: '#ffffff', orange: '#df3c22', brown: '#6b4423', red: '#c0392b',
  blue: '#2b5cb8', navy: '#1f2d5a', green: '#2e7d32', yellow: '#e8b800', grey: '#8a8a8a', gray: '#8a8a8a',
  'dark grey': '#4d4d4d', 'dark gray': '#4d4d4d',
  silver: '#c7c7c7', aluminium: '#c7c7c7', gold: '#c9a227', pink: '#e35b8f', purple: '#7b4bb8',
  clear: 'linear-gradient(135deg,#eee 25%,#fff 25% 50%,#eee 50% 75%,#fff 75%)',
  transparent: 'linear-gradient(135deg,#eee 25%,#fff 25% 50%,#eee 50% 75%,#fff 75%)',
}
/* Two-tone hazard/marking tapes ("B/Y Left", "Red/White Danger"...) don't have a single
   flat colour — resolve them to a real diagonal stripe instead of leaving no swatch at all. */
const LETTER = { b: SWATCH.black, w: SWATCH.white, y: SWATCH.yellow, r: SWATCH.red, g: SWATCH.green, o: '#ff6a1a' }
const WORD = { black: 'b', white: 'w', yellow: 'y', red: 'r', green: 'g', orange: 'o', fluro: 'o', danger: null }
function resolvePart(raw) {
  const p = raw.trim()
  if (!p) return null
  if (SWATCH[p]) return SWATCH[p]
  if (p.length <= 2 && LETTER[p[0]]) return LETTER[p[0]]
  for (const w in WORD) { if (WORD[w] && p.includes(w)) return LETTER[WORD[w]] }
  return null
}
export function swatchFill(n) {
  const s = String(n).toLowerCase().trim()
  if (SWATCH[s]) return SWATCH[s]
  const stripped = s.replace(/\b(left|right)\b/g, '').replace(/\s*\/\s*/g, '/').trim()
  if (stripped.includes('/')) {
    const [a, b] = stripped.split('/')
    const c1 = resolvePart(a), c2 = resolvePart(b)
    if (c1 && c2) return `repeating-linear-gradient(45deg, ${c1} 0 7px, ${c2} 7px 14px)`
  }
  return null
}
export const colourAxis = (p) => (p.axes || []).find((a) => /colou?r/i.test(a.name))
export const sizeAxis = (p) => (p.axes || []).find((a) => /size/i.test(a.name))

export const PRICE_OPTS = [
  ['all', 'All prices', () => true],
  ['u20', 'Under $20', (p) => p.from < 20],
  ['20-50', '$20 – $50', (p) => p.from >= 20 && p.from < 50],
  ['50-100', '$50 – $100', (p) => p.from >= 50 && p.from < 100],
  ['o100', 'Over $100', (p) => p.from >= 100],
]

/* Shared filter/sort state + derived product list — used by both the category
   (CollectionPage) and industry (IndustryPage) product listings. */
export function useProductFilters(baseList) {
  const [sort, setSort] = useState('featured')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [priceBucket, setPriceBucket] = useState('all')
  const [colours, setColours] = useState([])
  const [sizeFilter, setSizeFilter] = useState('all')
  const [categories, setCategories] = useState([])

  const availColours = useMemo(() => {
    const set = new Set()
    for (const p of baseList) { const ca = colourAxis(p); if (ca) ca.terms.forEach((t) => set.add(t)) }
    return [...set]
  }, [baseList])
  const availSizes = useMemo(() => {
    const set = new Set()
    for (const p of baseList) { const sa = sizeAxis(p); if (sa) sa.terms.forEach((t) => set.add(t)) }
    return [...set]
  }, [baseList])
  /* only meaningful when baseList spans more than one category (e.g. an industry
     page) — a single-category listing has nothing useful to filter here */
  const availCategories = useMemo(() => {
    const map = new Map()
    for (const p of baseList) { const c = p.cats?.[0]; if (c) map.set(c.slug, c.name) }
    return [...map.entries()].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [baseList])

  const products = useMemo(() => {
    let list = [...baseList]
    if (inStockOnly) list = list.filter((p) => p.inStock)
    const priceFn = (PRICE_OPTS.find(([v]) => v === priceBucket) || [])[2]
    if (priceFn) list = list.filter(priceFn)
    if (colours.length) list = list.filter((p) => { const ca = colourAxis(p); return ca && ca.terms.some((t) => colours.includes(t)) })
    if (sizeFilter !== 'all') list = list.filter((p) => { const sa = sizeAxis(p); return sa && sa.terms.includes(sizeFilter) })
    if (categories.length) list = list.filter((p) => p.cats?.[0] && categories.includes(p.cats[0].slug))
    const s = {
      'price-asc': (a, b) => a.from - b.from,
      'price-desc': (a, b) => b.from - a.from,
      rating: (a, b) => (b.rating - a.rating) || (b.reviews - a.reviews),
      name: (a, b) => a.name.localeCompare(b.name),
      featured: (a, b) => (b.reviews - a.reviews) || (b.rating - a.rating),
    }[sort]
    return list.sort(s)
  }, [baseList, sort, inStockOnly, priceBucket, colours, sizeFilter, categories])

  const toggleColour = (c) => setColours((cs) => cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c])
  const toggleCategory = (slug) => setCategories((cs) => cs.includes(slug) ? cs.filter((x) => x !== slug) : [...cs, slug])
  const filtersActive = inStockOnly || priceBucket !== 'all' || colours.length > 0 || sizeFilter !== 'all' || categories.length > 0
  const clearAll = () => { setInStockOnly(false); setPriceBucket('all'); setColours([]); setSizeFilter('all'); setCategories([]) }

  return {
    sort, setSort, products,
    inStockOnly, setInStockOnly, priceBucket, setPriceBucket,
    colours, availColours, toggleColour, sizeFilter, setSizeFilter, availSizes,
    categories, availCategories, toggleCategory,
    filtersActive, clearAll,
  }
}
