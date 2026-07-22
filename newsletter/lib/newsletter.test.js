import { describe, it, expect } from 'vitest'
import { build, render, TIPS } from './newsletter.js'
const products = [
  { id: '1', title: 'Self-Adhesive Roll', handle: 'a', price: '32.90', image: 'https://x/a.jpg', url: 'https://x/a', category: 'Self-Adhesive', createdAt: '2026-07-01' },
  { id: '2', title: 'Heavy-Duty Straps', handle: 'b', price: '63.00', image: 'https://x/b.jpg', url: 'https://x/b', category: 'Straps', createdAt: '2026-07-20' },
]
describe('newsletter', () => {
  it('build is deterministic per week and picks the newest product as new arrival', () => {
    const a = build(products, 30), b = build(products, 30)
    expect(a).toEqual(b)
    expect(a.newArrivalId).toBe('2')            // newest createdAt
    expect(a.tipId).toBe(30 % TIPS.length)
  })
  it('build rotates the spotlight across weeks', () => {
    expect(build(products, 30).spotlightId).not.toBe(build(products, 31).spotlightId)
  })
  it('render embeds subject, news, product titles and the unsubscribe token', () => {
    const fields = { subject: 'Hi', news: 'Big week', spotlightId: '1', newArrivalId: '2', tipId: 0 }
    const { subject, html, text } = render(fields, products)
    expect(subject).toBe('Hi')
    expect(html).toContain('Big week')
    expect(html).toContain('Self-Adhesive Roll')
    expect(html).toContain('{{unsubscribe}}')
    expect(text).toContain('Big week')
  })
})
