import Header from './components/Header.jsx'
import HeroSlides from './components/HeroSlides.jsx'
import FloatingActions from './components/FloatingActions.jsx'
import { WhyUs, OneStop, TrustedSupplier } from './sections/Basic.jsx'
import BestSellers from './sections/BestSellers.jsx'
import TrustReviews from './sections/TrustReviews.jsx'
import Footer from './sections/Footer.jsx'
import ProductPage from './pages/ProductPage.jsx'
import CollectionPage from './pages/CollectionPage.jsx'
import CartPage from './pages/CartPage.jsx'
import { ContactPage, BulkPage, AboutPage, PolicyPage, SearchPage, BlogPage, WishlistPage } from './pages/ContentPages.jsx'
import { useRoute } from './lib/cart.js'

import './styles/header.css'
import './styles/slides.css'
import './styles/sections.css'
import './styles/floating.css'
import './styles/product.css'
import './styles/pages.css'

function Landing() {
  return (
    <main id="main">
      <HeroSlides />
      <OneStop />
      <BestSellers />
      <TrustedSupplier />
      <WhyUs />
      <TrustReviews />
    </main>
  )
}

export default function App() {
  const { route, param } = useRoute()

  let page
  switch (route) {
    case 'collection': page = <CollectionPage slug={param} />; break
    case 'product': page = <ProductPage handle={param} />; break
    case 'cart': page = <CartPage />; break
    case 'wishlist': page = <WishlistPage />; break
    case 'search': page = <SearchPage query={param} />; break
    case 'bulk': page = <BulkPage />; break
    case 'contact': page = <ContactPage />; break
    case 'about': page = <AboutPage />; break
    case 'blog': page = <BlogPage />; break
    case 'shipping': case 'returns': case 'privacy': case 'terms': page = <PolicyPage which={route} />; break
    default: page = <Landing />
  }

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Header />
      {page}
      <Footer />
      <FloatingActions />
    </>
  )
}
