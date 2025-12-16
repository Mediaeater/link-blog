import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Pause, Play, X, SkipForward } from 'lucide-react';

/**
 * Times Square-style news ticker
 * Shows one entry at a time:
 * - Top row: Source, Date, Tags (static)
 * - Bottom row: Pull quote (scrolling)
 */
export default function NewsTicker({ links = [], forceShow = false, onClose }) {
  const [isPaused, setIsPaused] = useState(false);
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [needsScroll, setNeedsScroll] = useState(false);
  const quoteRef = useRef(null);
  const trackRef = useRef(null);

  // Show if forced OR landscape mobile
  const isVisible = forceShow || isLandscapeMobile;

  // Filter to only links with pull quotes for better experience
  const linksWithQuotes = useMemo(() => {
    return links.filter(link => link.pullQuote && link.pullQuote.trim().length > 0);
  }, [links]);

  // Current link to display
  const currentLink = linksWithQuotes[currentIndex] || links[currentIndex] || null;

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Advance to next link
  const nextLink = useCallback(() => {
    const list = linksWithQuotes.length > 0 ? linksWithQuotes : links;
    setCurrentIndex(prev => (prev + 1) % list.length);
  }, [linksWithQuotes, links]);

  // Auto-advance every 15 seconds (slow)
  useEffect(() => {
    if (!isVisible || isPaused || !currentLink) return;

    const timer = setInterval(() => {
      nextLink();
    }, 24000); // 24 seconds per entry to read

    return () => clearInterval(timer);
  }, [isVisible, isPaused, currentLink, nextLink]);

  // Detect landscape orientation on mobile
  useEffect(() => {
    const checkOrientation = () => {
      const landscape = window.matchMedia("(orientation: landscape)").matches;
      const mobile = window.matchMedia("(max-width: 768px)").matches;
      setIsLandscapeMobile(landscape && mobile);
    };

    checkOrientation();

    const landscapeQuery = window.matchMedia("(orientation: landscape)");
    const mobileQuery = window.matchMedia("(max-width: 768px)");

    landscapeQuery.addEventListener('change', checkOrientation);
    mobileQuery.addEventListener('change', checkOrientation);

    return () => {
      landscapeQuery.removeEventListener('change', checkOrientation);
      mobileQuery.removeEventListener('change', checkOrientation);
    };
  }, []);

  // Detect prefers-reduced-motion
  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(motionQuery.matches);

    const handleMotionChange = (e) => setPrefersReducedMotion(e.matches);
    motionQuery.addEventListener('change', handleMotionChange);

    return () => motionQuery.removeEventListener('change', handleMotionChange);
  }, []);

  // Auto-pause when reduced motion is preferred
  useEffect(() => {
    if (prefersReducedMotion) {
      setIsPaused(true);
    }
  }, [prefersReducedMotion]);

  // Check if quote needs scrolling (content overflows container)
  useEffect(() => {
    const checkOverflow = () => {
      if (quoteRef.current && trackRef.current) {
        const quoteHeight = quoteRef.current.scrollHeight;
        const trackHeight = trackRef.current.clientHeight;
        setNeedsScroll(quoteHeight > trackHeight + 20); // 20px buffer
      }
    };

    // Check after content renders
    const timer = setTimeout(checkOverflow, 100);
    return () => clearTimeout(timer);
  }, [currentIndex, currentLink]);

  // Keyboard controls
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT') return;

      if (e.key === ' ') {
        e.preventDefault();
        setIsPaused(prev => !prev);
      } else if (e.key === 'ArrowRight' || e.key === 'n') {
        nextLink();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible, nextLink]);

  const handleTogglePause = () => {
    setIsPaused(prev => !prev);
  };

  const handleItemClick = () => {
    if (currentLink?.url) {
      window.open(currentLink.url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isVisible || !currentLink) return null;

  const list = linksWithQuotes.length > 0 ? linksWithQuotes : links;

  return (
    <div
      className="ticker-container"
      role="region"
      aria-live="polite"
      aria-label="News ticker"
    >
      {/* Main content area */}
      <div className="ticker-card" onClick={handleItemClick}>
        {/* Top row: Static metadata */}
        <div className="ticker-meta">
          <span className="ticker-source">{currentLink.source}</span>
          <span className="ticker-separator">•</span>
          <span className="ticker-date">{formatDate(currentLink.timestamp)}</span>
          {currentLink.tags && currentLink.tags.length > 0 && (
            <>
              <span className="ticker-separator">•</span>
              <span className="ticker-tags">{currentLink.tags.join(', ')}</span>
            </>
          )}
        </div>

        {/* Bottom row: Quote text */}
        <div className="ticker-quote-track" ref={trackRef}>
          <div
            className={`ticker-quote ${needsScroll ? 'needs-scroll' : ''}`}
            key={currentIndex}
            ref={quoteRef}
          >
            {currentLink.pullQuote || currentLink.source}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="ticker-progress">
          <span>{currentIndex + 1} / {list.length}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="ticker-controls">
        <button
          className="ticker-control"
          onClick={(e) => { e.stopPropagation(); handleTogglePause(); }}
          aria-label={isPaused ? 'Resume' : 'Pause'}
          aria-pressed={isPaused}
        >
          {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
        </button>
        <button
          className="ticker-control"
          onClick={(e) => { e.stopPropagation(); nextLink(); }}
          aria-label="Next"
        >
          <SkipForward className="w-6 h-6" />
        </button>
        {onClose && (
          <button
            className="ticker-control"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}
