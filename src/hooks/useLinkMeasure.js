import { prepare, layout, measureNaturalWidth } from '@chenglou/pretext'

// Fonts matching the actual CSS (body font-family in index.css). Title and
// domain are fixed one-line constants; the pull quote and tag widths are
// measured with pretext. Keep these in sync with the body font stack:
// measuring with the wrong family miscounts wrapped lines and causes
// scroll-jitter churn.
const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
const PULL_QUOTE_FONT = `italic 14px ${FONT_STACK}` // text-sm italic
const TAG_FONT = `13px ${FONT_STACK}`               // .tag: var(--fs-xs)

// The content column (quote, tags) is narrower than the virtual-list
// container: flex gap-4 (16px) + the hover action column (32px button).
const CONTENT_INSET = 48

// Line heights from Tailwind/CSS
const BODY_LINE_HEIGHT = 27.2    // 17px * 1.6
const PULL_QUOTE_LINE_HEIGHT = 20 // text-sm: 14px / 20px

// Fixed card chrome. Calibrated against the live DOM 2026-11-07
// (Tailwind 4, system sans): every term below matches its element's
// getBoundingClientRect height, so there is no residual fudge term.
const CARD_PAD_TOP = 24          // py-6
const CARD_PAD_BOTTOM = 24       // py-6
const CARD_BORDER = 1            // border-b
const DOMAIN_LINE = 20           // text-sm truncate, 1 line
const QUOTE_MARGIN_TOP = 8       // mt-2
const PARAGRAPH_GAP = 8          // space-y-2
const TAGS_MARGIN_TOP = 12       // mt-3
const TAG_LINE_HEIGHT = 20.8     // 13px * 1.6
const TAG_HEIGHT = 28.8          // py-1 + one line
const TAG_PAD_X = 16             // px-2
const TAG_GAP = 4                // gap-1, both axes
const DATE_MARGIN_TOP = 12       // mt-3
const DATE_LINE = 16             // text-xs, 1 line

// Year divider: mt-6 (24) + border-t-2 (2) + py-4 (32) + text-xl h2 (28)
// + mb-2 (8). Includes the top margin because VirtualLinkList wraps each
// item in a flow-root div, so the margin is inside the measured box.
const YEAR_HEADER_HEIGHT = 94

// Cache prepared texts to avoid re-measuring
const preparedCache = new Map()

function getPrepared(text, font, options) {
  const key = font + '::' + text
  if (preparedCache.has(key)) return preparedCache.get(key)
  const p = prepare(text, font, options)
  preparedCache.set(key, p)
  return p
}

// Rewrite one quote paragraph the way the card renders it: white-space is
// normal (spaces collapse, edges trim) and each '\n' becomes a <br>. A
// segment followed by a <br> always makes a line box; a trailing
// whitespace-only segment makes none, so an empty paragraph is 0px tall.
function renderedLines(paragraph) {
  const segs = paragraph.split('\n').map(s => s.replace(/\s+/g, ' ').trim())
  if (segs[segs.length - 1] === '') segs.pop()
  return segs
}

function measurePullQuote(text, width) {
  let height = 0
  let visible = 0

  for (const paragraph of text.split('\n\n')) {
    let ph = 0
    for (const line of renderedLines(paragraph)) {
      if (line === '') { ph += PULL_QUOTE_LINE_HEIGHT; continue }
      const prepared = getPrepared(line, PULL_QUOTE_FONT)
      ph += layout(prepared, width, PULL_QUOTE_LINE_HEIGHT).height
    }
    // A 0px paragraph lets the space-y-2 margins on either side collapse
    // through it, and a trailing gap collapses into the tags/date mt-3. So
    // gaps only separate paragraphs that actually render.
    if (ph > 0) {
      if (visible > 0) height += PARAGRAPH_GAP
      height += ph
      visible++
    }
  }

  return height
}

function measureTags(tags, width) {
  let height = 0
  let rowHeight = 0
  let rowWidth = 0
  for (const tag of tags) {
    const prepared = getPrepared(tag, TAG_FONT)
    let tw = measureNaturalWidth(prepared) + TAG_PAD_X
    let th = TAG_HEIGHT
    // A tag wider than the column (a long slug) wraps its own text.
    if (tw > width) {
      tw = width
      th = TAG_HEIGHT - TAG_LINE_HEIGHT +
        layout(prepared, width - TAG_PAD_X, TAG_LINE_HEIGHT).height
    }
    if (rowWidth > 0 && rowWidth + TAG_GAP + tw > width) {
      height += rowHeight + TAG_GAP
      rowWidth = tw
      rowHeight = th
    } else {
      rowWidth += (rowWidth > 0 ? TAG_GAP : 0) + tw
      rowHeight = Math.max(rowHeight, th)
    }
  }
  return height + rowHeight
}

export function measureLinkHeight(link, containerWidth) {
  const contentWidth = containerWidth - CONTENT_INSET

  // Title + domain: always 1 line each (truncated)
  let h = CARD_PAD_TOP + BODY_LINE_HEIGHT + DOMAIN_LINE

  if (link.pullQuote) {
    h += QUOTE_MARGIN_TOP + measurePullQuote(link.pullQuote, contentWidth)
  }

  if (link.tags?.length > 0) {
    h += TAGS_MARGIN_TOP + measureTags(link.tags, contentWidth)
  }

  h += DATE_MARGIN_TOP + DATE_LINE
  h += CARD_PAD_BOTTOM + CARD_BORDER

  return h
}

export { YEAR_HEADER_HEIGHT }

export function clearMeasureCache() {
  preparedCache.clear()
}
