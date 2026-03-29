import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { measureLinkHeight, YEAR_HEADER_HEIGHT } from '../hooks/useLinkMeasure'

const OVERSCAN = 5

export default function VirtualLinkList({ links, renderItem }) {
  const containerRef = useRef(null)
  const [scrollY, setScrollY] = useState(0)
  const [viewportH, setViewportH] = useState(window.innerHeight)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerTop = useRef(0)

  // Observe container width for responsive re-measurement
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width
      setContainerWidth(width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

  // Build virtual items with pretext-measured heights
  const virtualItems = useMemo(() => {
    if (containerWidth === 0) return []

    let offset = 0
    return links.map((link, index) => {
      const prevLink = links[index - 1]
      const linkYear = new Date(link.timestamp).getFullYear()
      const prevYear = prevLink ? new Date(prevLink.timestamp).getFullYear() : null
      const showYearHeader = prevYear !== null && linkYear !== prevYear

      let height = measureLinkHeight(link, containerWidth)
      if (showYearHeader) height += YEAR_HEADER_HEIGHT

      const item = { link, index, showYearHeader, year: linkYear, offset, height }
      offset += height
      return item
    })
  }, [links, containerWidth])

  const totalHeight = virtualItems.length > 0
    ? virtualItems[virtualItems.length - 1].offset + virtualItems[virtualItems.length - 1].height
    : 0

  // Binary search for visible range
  const { start, end } = useMemo(() => {
    if (virtualItems.length === 0) return { start: 0, end: -1 }

    const relScroll = scrollY - containerTop.current
    const top = Math.max(0, relScroll)
    const bottom = relScroll + viewportH

    // Find first visible item
    let lo = 0
    let hi = virtualItems.length - 1
    let startIdx = 0
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1
      if (virtualItems[mid].offset + virtualItems[mid].height <= top) {
        lo = mid + 1
      } else {
        startIdx = mid
        hi = mid - 1
      }
    }
    startIdx = Math.max(0, startIdx - OVERSCAN)

    // Find last visible item
    lo = startIdx
    hi = virtualItems.length - 1
    let endIdx = virtualItems.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1
      if (virtualItems[mid].offset <= bottom) {
        endIdx = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    endIdx = Math.min(virtualItems.length - 1, endIdx + OVERSCAN)

    return { start: startIdx, end: endIdx }
  }, [scrollY, viewportH, virtualItems])

  // Before width is measured, render nothing (avoids flash of wrong layout)
  if (containerWidth === 0) {
    return <div ref={containerRef} style={{ minHeight: 1 }} />
  }

  return (
    <div ref={containerRef} style={{ height: totalHeight, position: 'relative' }}>
      {virtualItems.slice(start, end + 1).map((item) => (
        <div
          key={item.link.id}
          style={{
            position: 'absolute',
            top: item.offset,
            left: 0,
            right: 0,
          }}
        >
          {renderItem(item.link, item.index, item.showYearHeader, item.year)}
        </div>
      ))}
    </div>
  )
}
