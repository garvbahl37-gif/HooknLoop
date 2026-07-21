/*  HookLoopExplainer — installs the "two halves of one fastener" mental model
    (the store's #1 conversion leak) before any variant control is encountered.  */

function HookTexture() {
  return (
    <svg viewBox="0 0 120 70" className="hl__tex" role="img" aria-label="Stiff hooks">
      {Array.from({ length: 9 }).map((_, i) => (
        <path key={i} d={`M${10 + i * 12} 60 L${10 + i * 12} 24 q0 -12 -8 -12`} fill="none" stroke="var(--navy)" strokeWidth="3" strokeLinecap="round" />
      ))}
    </svg>
  )
}
function LoopTexture() {
  return (
    <svg viewBox="0 0 120 70" className="hl__tex" role="img" aria-label="Soft loops">
      {Array.from({ length: 9 }).map((_, i) => (
        <path key={i} d={`M${8 + i * 12} 60 C${8 + i * 12} 18, ${20 + i * 12} 18, ${20 + i * 12} 60`} fill="none" stroke="#9fb0cf" strokeWidth="3" strokeLinecap="round" />
      ))}
    </svg>
  )
}

export default function HookLoopExplainer() {
  return (
    <section className="hl" id="hook-vs-loop" aria-labelledby="hl-h">
      <div className="wrap">
        <div className="sec-head">
          <span className="sec-eyebrow">Hook &amp; loop, explained</span>
          <h2 id="hl-h" className="sec-h2">Two halves of one fastener</h2>
          <p className="sec-sub">The stiff hook side grabs the soft loop side. Apart, neither fastens to anything — together, they hold.</p>
        </div>

        <div className="hl__diagram">
          <div className="hl__half">
            <span className="hl__label">The hook side</span>
            <div className="hl__well"><HookTexture /></div>
            <p className="hl__desc"><b>Stiff, bristly, firm.</b> Thousands of tiny hooks.</p>
            <span className="hl__micro">grabs onto →</span>
          </div>

          <div className="hl__join">
            <span className="hl__badge">CLICK</span>
            <span className="hl__join-cap">press together</span>
          </div>

          <div className="hl__half">
            <span className="hl__label">The loop side</span>
            <div className="hl__well"><LoopTexture /></div>
            <p className="hl__desc"><b>Soft, fuzzy, brushed.</b> A dense field of loops.</p>
            <span className="hl__micro">← gets grabbed</span>
          </div>
        </div>

        <div className="hl__rec">
          <div className="hl__rec-body">
            <h3 className="hl__rec-h">Not sure which you need? Choose <span className="hl__rec-both">Both</span>.</h3>
            <p>Most jobs need one strip of hook and one strip of loop — a complete set. That’s why every product defaults to Both, so what arrives actually fastens. Already have one side? Switch to hook-only or loop-only on any product page.</p>
          </div>
          <div className="hl__rec-cta">
            <a href="#tape-finder" className="btn btn--primary">Find my fastener<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
            <a href="#" className="btn btn--ghost btn--ghost-dark">Shop all tape</a>
          </div>
        </div>
      </div>
    </section>
  )
}
