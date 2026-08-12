import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { measureLinkHeight, YEAR_HEADER_HEIGHT } from '../hooks/useLinkMeasure'

const OVERSCAN = 5

export default function VirtualLinkList({ links, renderItem }) {
  const containerRef = useRef(null)
  const [scrollY, setScrollY] = useState(0)
  const [viewportH, setViewportH] = useState(window.innerHeight)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerTop = useRef(0)
  const heightCache = useRef(new Map())
  const [measureVersion, setMeasureVersion] = useState(0)
  const pendingUpdate = useRef(false)
  // Mirror of containerWidth for measureItem, which needs the width the
  // current layout was computed with but must stay referentially stable.
  const widthRef = useRef(0)

  // Observe container width for responsive re-measurement
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width
      // The observer also fires when the container's HEIGHT changes — which
      // happens on every offsets recompute. Wiping the cache then re-triggers
      // corrections, whose height changes fire the observer again: a
      // self-sustaining wipe/correct loop (the scroll-jitter bug). Only a
      // real width change invalidates cached heights.
      if (width === widthRef.current) return
      widthRef.current = width
      setContainerWidth(width)
      heightCache.current.clear()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Clear height cache when link list changes (filtering/sorting).
  // Deliberately reads/writes refs during render (the "adjust state while
  // rendering" pattern, applied to a ref-backed cache instead of state) so the
  // cache is invalidated before the offsets useMemo below runs in this same
  // render — using state here would cost an extra render pass for a value
  // that's never itself rendered. Perf-critical for the virtualized list.
  /* eslint-disable react-hooks/refs -- see justification above; safe, pre-existing pattern */
  const prevLinksRef = useRef(links)
  if (prevLinksRef.current !== links) {
    heightCache.current.clear()
    prevLinksRef.current = links
  }
  /* eslint-enable react-hooks/refs */

  // Track container's offset from page top
  const updateContainerTop = useCallback(() => {
    if (containerRef.current) {
      containerTop.current = containerRef.current.getBoundingClientRect().top + window.scrollY
    }
  }, [])

  // Scroll + resize listeners
  useEffect(() => {
    const onScroll = () => {
      setScrollY(window.scrollY)
      updateContainerTop()
    }
    const onResize = () => setViewportH(window.innerHeight)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    updateContainerTop()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [updateContainerTop])

  // Precompute item metadata. `key` is collision-safe: duplicate link ids
  // (e.g. from an admin-UI double-submit) get an index suffix so React keys
  // stay unique and the height cache never flip-flops between two nodes.
  const itemMeta = useMemo(() => {
    const seenIds = new Set()
    return links.map((link, index) => {
      const prevLink = links[index - 1]
      const linkYear = new Date(link.timestamp).getFullYear()
      const prevYear = prevLink ? new Date(prevLink.timestamp).getFullYear() : null
      const showYearHeader = prevYear !== null && linkYear !== prevYear
      const key = seenIds.has(link.id) ? `${link.id}:${index}` : link.id
      seenIds.add(link.id)
      return { link, index, showYearHeader, year: linkYear, key }
    })
  }, [links])

  // Calculate offsets using cached DOM heights or pretext estimates
  const { offsets, totalHeight } = useMemo(() => {
    if (containerWidth === 0) return { offsets: [], totalHeight: 0 }

    const offs = [0]
    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      const meta = itemMeta[i]

      // Reading the height cache ref during render is intentional: it's a plain
      // Map used as an imperative memoization cache (not UI state), so this
      // avoids re-measuring/re-rendering on every scroll frame.
      // eslint-disable-next-line react-hooks/refs -- perf cache read, not used for rendering output
      let h = heightCache.current.get(meta.key)
      if (h === undefined) {
        h = measureLinkHeight(link, containerWidth)
        if (meta.showYearHeader) h += YEAR_HEADER_HEIGHT
      }

      offs.push(offs[i] + h)
    }

    return { offsets: offs, totalHeight: offs[offs.length - 1] || 0 }
    // measureVersion is not read in this body — it's a deliberate cache-busting
    // trigger bumped by measureItem() below after an async DOM height correction,
    // so offsets must be recomputed even though the ref value itself isn't a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links, containerWidth, itemMeta, measureVersion])

  // Binary search for visible range
  const { start, end } = useMemo(() => {
    if (offsets.length <= 1) return { start: 0, end: -1 }

    // containerTop is kept in a ref (updated by the scroll/resize listeners
    // above) instead of state so scrolling doesn't trigger an extra render on
    // every pixel — reading it here during the binary-search useMemo is the
    // point of the optimization.
    // eslint-disable-next-line react-hooks/refs -- perf: avoids state update per scroll event
    const relScroll = scrollY - containerTop.current
    const top = Math.max(0, relScroll)
    const bottom = relScroll + viewportH

    let lo = 0, hi = links.length - 1, startIdx = 0
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1
      if (offsets[mid + 1] <= top) lo = mid + 1
      else { startIdx = mid; hi = mid - 1 }
    }
    startIdx = Math.max(0, startIdx - OVERSCAN)

    lo = startIdx; hi = links.length - 1; let endIdx = links.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1
      if (offsets[mid] <= bottom) { endIdx = mid; lo = mid + 1 }
      else hi = mid - 1
    }
    endIdx = Math.min(links.length - 1, endIdx + OVERSCAN)

    return { start: startIdx, end: endIdx }
  }, [scrollY, viewportH, offsets, links.length])

  // Measure actual DOM heights and correct. Runs as a ref callback during
  // React's commit — i.e. BEFORE the browser paints — so scroll compensation
  // applied here is invisible: no frame ever shows the shifted layout.
  const measureItem = useCallback((el, meta) => {
    if (!el) return
    const rect = el.getBoundingClientRect()
    const actual = rect.height
    const cached = heightCache.current.get(meta.key)
    if (cached !== undefined && Math.abs(actual - cached) <= 1) return

    // Height the current layout assumed for this slot (cached measurement,
    // or the same estimate the offsets memo used on cache miss).
    let assumed = cached
    if (assumed === undefined) {
      assumed = measureLinkHeight(meta.link, widthRef.current)
      if (meta.showYearHeader) assumed += YEAR_HEADER_HEIGHT
    }
    heightCache.current.set(meta.key, actual)

    // If the corrected item starts above the viewport top (fully above or
    // straddling the top edge — where items mount during upward scrolls),
    // its true height has just displaced the content the user is reading.
    // Scroll by the delta now, pre-paint, so the visible content stays put.
    // Items starting in or below the viewport don't displace the reading
    // position, so no compensation is needed for them.
    const delta = actual - assumed
    if (rect.top < 0 && Math.abs(delta) > 0.5) {
      window.scrollBy(0, delta)
    }

    if (!pendingUpdate.current) {
      pendingUpdate.current = true
      requestAnimationFrame(() => {
        pendingUpdate.current = false
        setMeasureVersion(v => v + 1)
      })
    }
  }, [])

  if (containerWidth === 0) {
    return <div ref={containerRef} style={{ minHeight: 1 }} />
  }

  const topSpacerH = offsets[start] || 0
  const bottomSpacerH = totalHeight - (offsets[end + 1] || totalHeight)

  return (
    // overflow-anchor off: we compensate scroll manually in the layout effect
    // above; the browser's native scroll anchoring would double-correct.
    <div ref={containerRef} style={{ overflowAnchor: 'none' }}>
      {topSpacerH > 0 && <div style={{ height: topSpacerH }} />}
      {itemMeta.slice(start, end + 1).map((meta) => (
        <div key={meta.key} ref={(el) => measureItem(el, meta)}>
          {renderItem(meta.link, meta.index, meta.showYearHeader, meta.year)}
        </div>
      ))}
      {bottomSpacerH > 0 && <div style={{ height: bottomSpacerH }} />}
    </div>
  )
}
