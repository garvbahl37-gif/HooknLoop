import TrustStrip from '../components/TrustStrip.jsx'
import HeroSlider from '../components/HeroSlider.jsx'
import { IntroBand, CategoryShowcase, FeaturedGrid, BrandWall, RangeSection, SealTheDeal, IndustriesShowcase, Testimonials, Wholesale, FAQ, ValueProps } from '../sections/home.jsx'

export default function Home() {
  return (
    <main id="main">
      <HeroSlider />
      <TrustStrip />
      <IntroBand />
      <CategoryShowcase />
      <FeaturedGrid />
      <BrandWall />
      <RangeSection />
      <SealTheDeal />
      <IndustriesShowcase />
      <Testimonials />
      <Wholesale />
      <FAQ />
      <ValueProps />
    </main>
  )
}
