import Icon from './Icon.jsx'
import { swatchFill, PRICE_OPTS } from '../lib/filters.js'

export default function FilterPanel({ priceBucket, setPriceBucket, colours, availColours, toggleColour, sizeFilter, setSizeFilter, availSizes, inStockOnly, setInStockOnly, onClear, active }) {
  return (
    <div className="filt-card">
      <div className="filt-card__head"><Icon name="ruler" size={15} /> Filter</div>

      <div className="filt">
        <h3 className="filt__title">Availability</h3>
        <label className="filt__check">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
          <span>In stock only</span>
        </label>
      </div>

      {availColours.length > 0 && (
        <div className="filt">
          <h3 className="filt__title">Colour</h3>
          <div className="filt__colours">
            {availColours.map((c) => {
              const on = colours.includes(c); const fill = swatchFill(c)
              return (
                <button key={c} className={'filt__colour' + (on ? ' is-on' : '')} onClick={() => toggleColour(c)} title={c} aria-pressed={on}>
                  {fill ? <span className="filt__colour-dot" style={{ background: fill }} /> : null}
                  <span className="filt__colour-lbl">{c}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {availSizes.length > 0 && (
        <div className="filt">
          <h3 className="filt__title">Size</h3>
          <div className="filt__select">
            <select value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)} aria-label="Filter by size">
              <option value="all">All sizes</option>
              {availSizes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Icon name="chevronDown" size={15} />
          </div>
        </div>
      )}

      <div className="filt">
        <h3 className="filt__title">Price</h3>
        {PRICE_OPTS.map(([v, label]) => (
          <label key={v} className="filt__radio">
            <input type="radio" name="price" checked={priceBucket === v} onChange={() => setPriceBucket(v)} />
            <span>{label}</span>
          </label>
        ))}
      </div>

      {active && <button className="filt__clear" onClick={onClear}>Clear all filters</button>}
    </div>
  )
}
