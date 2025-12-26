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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [scrollDuration, setScrollDuration] = useState(25);
  const quoteRef = useRef(null);
  const trackRef = useRef(null);
  const hideControlsTimer = useRef(null);
  const nextLinkRef = useRef(null);

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

  // Extract domain from URL
  const getDomain = (url) => {
    if (!url) return '';
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  };

  // Advance to next link with black transition
  const nextLink = useCallback(() => {
    const list = linksWithQuotes.length > 0 ? linksWithQuotes : links;
    if (list.length === 0) return;

    // Start transition to black
    setIsTransitioning(true);
    // After 1 second of black, change the story
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % list.length);
      setIsTransitioning(false);
    }, 1000);
  }, [linksWithQuotes, links]);

  // Keep ref updated with latest nextLink
  useEffect(() => {
    nextLinkRef.current = nextLink;
  }, [nextLink]);

  // Auto-advance timer - uses ref to avoid resetting interval on nextLink changes
  useEffect(() => {
    if (!isVisible || isPaused || isTransitioning) return;

    const list = linksWithQuotes.length > 0 ? linksWithQuotes : links;
    if (list.length === 0) return;

    const timer = setInterval(() => {
      if (nextLinkRef.current) {
        nextLinkRef.current();
      }
    }, 32000); // 32 seconds per entry (6s hold + 25s scroll + 1s black transition)

    return () => clearInterval(timer);
  }, [isVisible, isPaused, isTransitioning, linksWithQuotes.length, links.length]);

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

  // Check if quote needs scrolling and calculate dynamic scroll duration
  useEffect(() => {
    const checkOverflow = () => {
      if (quoteRef.current && trackRef.current) {
        const quoteHeight = quoteRef.current.scrollHeight;
        const trackHeight = trackRef.current.clientHeight;
        const overflow = quoteHeight - trackHeight;

        if (overflow > 20) {
          setNeedsScroll(true);
          // Calculate duration based on overflow: ~40px per second for consistent speed
          const calculatedDuration = Math.max(15, Math.min(60, overflow / 40));
          setScrollDuration(calculatedDuration);
        } else {
          setNeedsScroll(false);
        }
      }
    };

    // Check after content renders
    const timer = setTimeout(checkOverflow, 100);
    return () => clearTimeout(timer);
  }, [currentIndex, currentLink]);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (!isVisible) return;

    const startHideTimer = () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    // Start timer on mount and when controls are shown
    if (showControls) {
      startHideTimer();
    }

    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, [isVisible, showControls]);

  // Show controls on tap/click anywhere
  const handleScreenTap = useCallback((e) => {
    // Don't trigger if clicking a button
    if (e.target.closest('.ticker-control')) return;
    setShowControls(true);
  }, []);

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

  // Don't render if not visible or still loading (prevents "no links" flash)
  if (!isVisible) return null;
  if (!currentLink && links.length === 0) return null;
  if (!currentLink) return null;

  const list = linksWithQuotes.length > 0 ? linksWithQuotes : links;

  return (
    <div
      className="ticker-container"
      role="region"
      aria-live="polite"
      aria-label="News ticker"
      onClick={handleScreenTap}
    >
      {/* Main content area */}
      <div className={`ticker-card ${isTransitioning ? 'ticker-fade-out' : ''}`} onClick={handleItemClick}>
        {/* Top: Source headline + domain */}
        <div className="ticker-headline">
          <span className="ticker-source">{currentLink.source}</span>
          <span className="ticker-domain">{getDomain(currentLink.url)}</span>
        </div>

        {/* Middle: Quote text */}
        <div className="ticker-quote-track" ref={trackRef}>
          <div
            className={`ticker-quote ${needsScroll ? 'needs-scroll' : ''}`}
            key={currentIndex}
            ref={quoteRef}
            style={needsScroll ? { '--scroll-duration': `${scrollDuration}s` } : undefined}
          >
            {currentLink.pullQuote || currentLink.source}
          </div>
        </div>

        {/* Bottom: Date and tags */}
        <div className="ticker-footer">
          <span className="ticker-date">{formatDate(currentLink.timestamp)}</span>
          {currentLink.tags && currentLink.tags.length > 0 && (
            <>
              <span className="ticker-separator">•</span>
              <span className="ticker-tags">{currentLink.tags.join(', ')}</span>
            </>
          )}
        </div>

        {/* Progress indicator - auto-hides */}
        <div className={`ticker-progress ${showControls ? '' : 'ticker-hidden'}`}>
          <span>{currentIndex + 1} / {list.length}</span>
        </div>
      </div>

      {/* Controls - auto-hide */}
      <div className={`ticker-controls ${showControls ? '' : 'ticker-hidden'}`}>
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
