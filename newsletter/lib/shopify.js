import { FALLBACK_PRODUCTS } from '../data/catalog.js'

const configured = () => !!(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ADMIN_TOKEN)
const endpoint = () =>
  `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${process.env.SHOPIFY_API_VERSION || '2025-01'}/graphql.json`

async function gql(query, variables) {
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Shopify ${res.status}`)
  const json = await res.json()
  if (json.errors) throw new Error('Shopify GraphQL error')
  return json.data
}

export function mapShopifyProduct(node) {
  return {
    id: node.id, title: node.title, handle: node.handle,
    price: node.priceRangeV2?.minVariantPrice?.amount ?? '',
    image: node.featuredImage?.url ?? '', url: node.onlineStoreUrl ?? '',
    category: node.productType ?? '', createdAt: node.createdAt,
  }
}
export function mapShopifyCustomer(node) {
  return { email: node.email, firstName: node.firstName ?? '' }
}

// DEVELOPER SEAM: verify these field names against your Admin API version via context7.
const PRODUCTS_Q = `query { products(first: 24, sortKey: CREATED_AT, reverse: true) {
  nodes { id title handle createdAt productType onlineStoreUrl featuredImage { url }
          priceRangeV2 { minVariantPrice { amount } } } } }`
const CUSTOMERS_Q = `query($cursor: String) { customers(first: 100, after: $cursor) {
  nodes { email firstName emailMarketingConsent { marketingState } }
  pageInfo { hasNextPage endCursor } } }`

export async function getProducts() {
  if (!configured()) return FALLBACK_PRODUCTS
  try {
    const data = await gql(PRODUCTS_Q)
    const mapped = data.products.nodes.map(mapShopifyProduct).filter(p => p.image && p.url)
    return mapped.length ? mapped : FALLBACK_PRODUCTS
  } catch { return FALLBACK_PRODUCTS }
}

export async function getMarketingCustomers() {
  if (!configured()) return []
  const out = []; let cursor = null
  do {
    const data = await gql(CUSTOMERS_Q, { cursor })
    for (const n of data.customers.nodes)
      if (n.emailMarketingConsent?.marketingState === 'SUBSCRIBED' && n.email) out.push(mapShopifyCustomer(n))
    cursor = data.customers.pageInfo.hasNextPage ? data.customers.pageInfo.endCursor : null
  } while (cursor)
  return out
}
