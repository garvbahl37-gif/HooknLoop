import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import CallButton from './components/CallButton.jsx'
import ChatWidget from './components/ChatWidget.jsx'
import { ValueProps } from './sections/home.jsx'
import Home from './pages/Home.jsx'
import CollectionPage from './pages/CollectionPage.jsx'
import ProductPage from './pages/ProductPage.jsx'
import CartPage from './pages/CartPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import { IndustriesPage, IndustryPage } from './pages/IndustryPages.jsx'
import { AboutPage, ContactPage, BulkPage, PolicyPage, WishlistPage, AccountPage } from './pages/ContentPages.jsx'
import { useRoute } from './lib/cart.js'

import './styles/header.css'
import './styles/home.css'
import './styles/product-card.css'
import './styles/footer.css'
import './styles/ui.css'
import './styles/collection.css'
import './styles/product.css'
import './styles/cart.css'
import './styles/checkout.css'
import './styles/industries.css'
import './styles/pages.css'
import './styles/chat.css'

export default function App() {
  const { route, param } = useRoute()

  let page
  switch (route) {
    case 'shop': page = <CollectionPage all />; break
    case 'collection': page = <CollectionPage slug={param} />; break
    case 'product': page = <ProductPage handle={param} />; break
    case 'cart': page = <CartPage />; break
    case 'checkout': page = <CheckoutPage />; break
    case 'wishlist': page = <WishlistPage />; break
    case 'account': case 'signin': page = <AccountPage />; break
    case 'search': page = <SearchPage query={param} />; break
    case 'industries': page = <IndustriesPage />; break
    case 'industry': page = <IndustryPage slug={param} />; break
    case 'about': page = <AboutPage />; break
    case 'contact': page = <ContactPage />; break
    case 'bulk': page = <BulkPage />; break
    case 'shipping': case 'returns': case 'privacy': case 'terms': page = <PolicyPage which={route} />; break
    default: page = <Home />
  }

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Header />
      {page}
      <ValueProps />
      <Footer />
      <CallButton />
      <ChatWidget />
    </>
  )
}
