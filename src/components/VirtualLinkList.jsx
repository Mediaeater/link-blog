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

  // Observe container width for responsive re-measurement
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width
      setContainerWidth(width)
      heightCache.current.clear()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Clear height cache when link list changes (filtering/sorting)
  const prevLinksRef = useRef(links)
  if (prevLinksRef.current !== links) {
    heightCache.current.clear()
    prevLinksRef.current = links
  }

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

  // Precompute item metadata
  const itemMeta = useMemo(() => {
    return links.map((link, index) => {
      const prevLink = links[index - 1]
      const linkYear = new Date(link.timestamp).getFullYear()
      const prevYear = prevLink ? new Date(prevLink.timestamp).getFullYear() : null
      const showYearHeader = prevYear !== null && linkYear !== prevYear
      return { link, index, showYearHeader, year: linkYear }
    })
  }, [links])

  // Calculate offsets using cached DOM heights or pretext estimates
  const { offsets, totalHeight } = useMemo(() => {
    if (containerWidth === 0) return { offsets: [], totalHeight: 0 }

    const offs = [0]
    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      const meta = itemMeta[i]

      let h = heightCache.current.get(link.id)
      if (h === undefined) {
        h = measureLinkHeight(link, containerWidth)
        if (meta.showYearHeader) h += YEAR_HEADER_HEIGHT
      }

      offs.push(offs[i] + h)
    }

    return { offsets: offs, totalHeight: offs[offs.length - 1] || 0 }
  }, [links, containerWidth, itemMeta, measureVersion])

  // Binary search for visible range
  const { start, end } = useMemo(() => {
    if (offsets.length <= 1) return { start: 0, end: -1 }

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

  // Measure actual DOM heights and correct
  const measureItem = useCallback((el, linkId) => {
    if (!el) return
    const actual = el.getBoundingClientRect().height
    const cached = heightCache.current.get(linkId)
    if (cached === undefined || Math.abs(actual - cached) > 1) {
      heightCache.current.set(linkId, actual)
      if (!pendingUpdate.current) {
        pendingUpdate.current = true
        requestAnimationFrame(() => {
          pendingUpdate.current = false
          setMeasureVersion(v => v + 1)
        })
      }
    }
  }, [])

  if (containerWidth === 0) {
    return <div ref={containerRef} style={{ minHeight: 1 }} />
  }

  const topSpacerH = offsets[start] || 0
  const bottomSpacerH = totalHeight - (offsets[end + 1] || totalHeight)

  return (
    <div ref={containerRef}>
      {topSpacerH > 0 && <div style={{ height: topSpacerH }} />}
      {itemMeta.slice(start, end + 1).map((meta) => (
        <div key={meta.link.id} ref={(el) => measureItem(el, meta.link.id)}>
          {renderItem(meta.link, meta.index, meta.showYearHeader, meta.year)}
        </div>
      ))}
      {bottomSpacerH > 0 && <div style={{ height: bottomSpacerH }} />}
    </div>
  )
}
