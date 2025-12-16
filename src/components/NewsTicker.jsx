import { useState, useEffect, useMemo } from 'react';
import { Pause, Play, X } from 'lucide-react';

/**
 * Times Square-style news ticker
 * Shows in landscape orientation on mobile devices
 * Auto-scrolls link titles horizontally
 */
export default function NewsTicker({ links = [], forceShow = false, onClose }) {
  const [isPaused, setIsPaused] = useState(false);
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Show if forced OR landscape mobile
  const isVisible = forceShow || isLandscapeMobile;

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

  // Keyboard controls (Space to pause)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === ' ' && isVisible && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        setIsPaused(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  // Duplicate links for seamless infinite loop
  const tickerItems = useMemo(() => {
    if (links.length === 0) return [];
    return [...links, ...links, ...links];
  }, [links]);

  // Calculate animation duration based on content length
  const animationDuration = useMemo(() => {
    const baseSpeed = links.length * 3;
    return Math.max(20, Math.min(90, baseSpeed));
  }, [links.length]);

  const handleTogglePause = () => {
    setIsPaused(prev => !prev);
  };

  const handleItemClick = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isVisible || links.length === 0) return null;

  return (
    <div
      className="ticker-container"
      role="marquee"
      aria-live="off"
      aria-label="News ticker"
    >
      <div className="ticker-track">
        <div
          className={`ticker-content ${isPaused ? 'paused' : ''}`}
          style={{ animationDuration: `${animationDuration}s` }}
        >
          {tickerItems.map((link, index) => (
            <div key={`${link.id}-${index}`} className="ticker-item-wrapper">
              <button
                className="ticker-item"
                onClick={() => handleItemClick(link.url)}
                aria-label={`Open: ${link.source}`}
              >
                <span className="ticker-bullet">+++</span>
                <span className="ticker-title">{link.source}</span>
                {link.tags && link.tags.length > 0 && (
                  <span className="ticker-tags">
                    [{link.tags.slice(0, 2).join(', ')}]
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="ticker-controls">
        <button
          className="ticker-control"
          onClick={handleTogglePause}
          aria-label={isPaused ? 'Resume ticker' : 'Pause ticker'}
          aria-pressed={isPaused}
        >
          {isPaused ? (
            <Play className="w-5 h-5" />
          ) : (
            <Pause className="w-5 h-5" />
          )}
        </button>
        {onClose && (
          <button
            className="ticker-control"
            onClick={onClose}
            aria-label="Close ticker"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {prefersReducedMotion && (
        <div className="ticker-notice">
          Motion paused
        </div>
      )}
    </div>
  );
}
