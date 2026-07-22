import { describe, it, expect } from 'vitest'
import { getProducts, getMarketingCustomers, mapShopifyProduct } from './shopify.js'
describe('shopify adapter', () => {
  it('falls back to local catalog when SHOPIFY env is unset', async () => {
    delete process.env.SHOPIFY_STORE_DOMAIN
    const products = await getProducts()
    expect(products.length).toBeGreaterThan(0)
    expect(products[0]).toHaveProperty('id')
    expect(products[0].image).toMatch(/^https?:\/\//)
    expect(await getMarketingCustomers()).toEqual([])
  })
  it('maps a Shopify product node to the build() shape', () => {
    const node = { id: 'gid://shopify/Product/9', title: 'X', handle: 'x', createdAt: '2026-07-20T00:00:00Z',
      onlineStoreUrl: 'https://s/x', featuredImage: { url: 'https://s/x.jpg' },
      priceRangeV2: { minVariantPrice: { amount: '12.50' } }, productType: 'Straps' }
    const p = mapShopifyProduct(node)
    expect(p).toEqual({ id: 'gid://shopify/Product/9', title: 'X', handle: 'x', price: '12.50',
      image: 'https://s/x.jpg', url: 'https://s/x', category: 'Straps', createdAt: '2026-07-20T00:00:00Z' })
  })
})
