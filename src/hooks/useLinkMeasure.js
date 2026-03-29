import { prepare, layout } from '@chenglou/pretext'

// Fonts matching the actual CSS
const BODY_FONT = '500 17px Inter, -apple-system, BlinkMacSystemFont, sans-serif'
const PULL_QUOTE_FONT = 'italic 14px Inter, -apple-system, BlinkMacSystemFont, sans-serif'

// Line heights from Tailwind/CSS
const BODY_LINE_HEIGHT = 27.2    // 17px * 1.6
const PULL_QUOTE_LINE_HEIGHT = 20 // text-sm: 14px / 20px

// Fixed card chrome (from CSS inspection)
const CARD_PAD_TOP = 24          // py-6
const CARD_PAD_BOTTOM = 24       // py-6
const CARD_BORDER = 1            // border-b
const DOMAIN_LINE = 20           // text-sm truncate, 1 line
const QUOTE_MARGIN_TOP = 8       // mt-2
const TAGS_MARGIN_TOP = 12       // mt-3
const TAG_ROW_HEIGHT = 28        // tag button height + flex gap
const DATE_MARGIN_TOP = 12       // mt-3
const DATE_LINE = 16             // text-xs, 1 line
const PARAGRAPH_GAP = 8          // space-y-2

const YEAR_HEADER_HEIGHT = 72    // py-4 mt-6 mb-2 border-t-2 + h2

// Cache prepared texts to avoid re-measuring
const preparedCache = new Map()

function getPrepared(text, font, options) {
  const key = font + '::' + text
  if (preparedCache.has(key)) return preparedCache.get(key)
  const p = prepare(text, font, options)
  preparedCache.set(key, p)
  return p
}

function measurePullQuote(text, width) {
  const paragraphs = text.split('\n\n')
  let height = 0

  for (let i = 0; i < paragraphs.length; i++) {
    if (i > 0) height += PARAGRAPH_GAP
    const prepared = getPrepared(paragraphs[i], PULL_QUOTE_FONT, { whiteSpace: 'pre-wrap' })
    const result = layout(prepared, width, PULL_QUOTE_LINE_HEIGHT)
    height += result.height
  }

  return height
}

export function measureLinkHeight(link, containerWidth) {
  // Title: always 1 line (truncated)
  let h = CARD_PAD_TOP + BODY_LINE_HEIGHT + DOMAIN_LINE

  // Pull quote (variable height — this is where pretext shines)
  if (link.pullQuote) {
    h += QUOTE_MARGIN_TOP + measurePullQuote(link.pullQuote, containerWidth)
  }

  // Tags: estimate row wrapping
  if (link.tags?.length > 0) {
    const tagWidths = link.tags.map(t => t.length * 7.5 + 24)
    let rows = 1
    let rowWidth = 0
    for (const tw of tagWidths) {
      if (rowWidth > 0 && rowWidth + tw + 4 > containerWidth) {
        rows++
        rowWidth = tw
      } else {
        rowWidth += tw + 4
      }
    }
    h += TAGS_MARGIN_TOP + rows * TAG_ROW_HEIGHT
  }

  // Date line
  h += DATE_MARGIN_TOP + DATE_LINE

  // Bottom padding + border
  h += CARD_PAD_BOTTOM + CARD_BORDER

  return h
}

export { YEAR_HEADER_HEIGHT }

export function clearMeasureCache() {
  preparedCache.clear()
}
