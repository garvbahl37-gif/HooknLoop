import { PRODUCTS, PRODUCT_CATEGORIES } from '../data/catalog.js'

export function searchProducts(query, limit) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  const ranked = PRODUCTS.map((p) => {
    const hay = [p.name, p.sku, ...p.cats.map((c) => c.name), ...p.industries.map((c) => c.name),
      ...(p.axes || []).flatMap((a) => a.terms)].join(' ').toLowerCase()
    let score = 0
    for (const t of terms) { if (hay.includes(t)) score += p.name.toLowerCase().includes(t) ? 3 : 1 }
    return { p, score }
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || b.p.reviews - a.p.reviews).map((x) => x.p)
  return limit ? ranked.slice(0, limit) : ranked
}

export function searchCategories(query, limit) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  const ranked = PRODUCT_CATEGORIES.filter((c) => c.count > 0).map((c) => {
    const hay = c.name.toLowerCase()
    let score = 0
    for (const t of terms) { if (hay.includes(t)) score += hay.startsWith(t) ? 2 : 1 }
    return { c, score }
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || b.c.count - a.c.count).map((x) => x.c)
  return limit ? ranked.slice(0, limit) : ranked
}
