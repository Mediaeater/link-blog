import { useState, useEffect, useCallback, useMemo, useRef, useDeferredValue } from 'react';
import {
  Search,
  Plus,
  X,
  ExternalLink,
  Tag as TagIcon,
  Pin,
  Edit2,
  Trash2,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Copy,
  Check,
  Filter,
  Info,
  AlertTriangle
} from 'lucide-react';
import { suggestTagsFromUrl } from '../utils/tagSuggestions';
import { loadArchiveMetadata, loadArchiveYear } from '../utils/storage';
import NewsTicker from './NewsTicker';

const ADMIN_USER = import.meta.env.VITE_ADMIN_PASSWORD || 'YourNewPassword';
const STORAGE_KEY = 'linkBlogData';
const MAX_TITLE_LENGTH = 120;

const SORT_OPTIONS = {
  DATE_DESC: 'date-desc',
  DATE_ASC: 'date-asc',
  TITLE: 'title',
};

export default function LinkBlogClean() {
  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState({ url: '', source: '', pullQuote: '', tags: [], tagInput: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.DATE_DESC);
  const [expandedLinks, setExpandedLinks] = useState(new Set());
  const [editingLink, setEditingLink] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddUrls, setQuickAddUrls] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState(null);
  const [focusedLinkIndex, setFocusedLinkIndex] = useState(-1);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [currentTagInput, setCurrentTagInput] = useState('');
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const [isMinimalView, setIsMinimalView] = useState(false);
  const [archives, setArchives] = useState([]);
  const [loadedArchives, setLoadedArchives] = useState(new Set());
  const [showArchives, setShowArchives] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [dataWarning, setDataWarning] = useState(null);
  const [showTicker, setShowTicker] = useState(false);

  const searchRef = useRef(null);
  const autoBackupRef = useRef(null);
  const quickPasteRef = useRef(null);
  const linkRefs = useRef({});
  const tagInputRef = useRef(null);

  // React 18 performance: defer expensive filter/sort operations
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const deferredSelectedTags = useDeferredValue(selectedTags);
  const isSearchPending = searchTerm !== deferredSearchTerm;

  // Load links from storage
  const loadLinks = useCallback(async () => {
    try {
      console.log('Loading links from storage...');
      // Try to load from JSON first
      const response = await fetch('/data/links.json?t=' + Date.now());
      if (response.ok) {
        const jsonData = await response.json();
        console.log('Loaded JSON data:', jsonData);

        // Also check localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        let localData = null;
        if (stored) {
          localData = JSON.parse(stored);
        }

        // Use the most recent data with version check warning
        if (localData && localData.lastUpdated && jsonData.lastUpdated) {
          const jsonTime = new Date(jsonData.lastUpdated).getTime();
          const localTime = new Date(localData.lastUpdated).getTime();
          const localCount = localData.links?.length || 0;
          const jsonCount = jsonData.links?.length || 0;

          if (localTime > jsonTime) {
            // localStorage is newer - use it but warn if counts differ significantly
            setLinks(localData.links || []);
            if (localCount > jsonCount) {
              setDataWarning({
                message: `Browser has ${localCount - jsonCount} more links than server. Save to sync.`,
                localCount,
                jsonCount,
                localTime: new Date(localData.lastUpdated).toLocaleString(),
                jsonTime: new Date(jsonData.lastUpdated).toLocaleString()
              });
            }
          } else {
            // JSON is newer - but warn before overwriting if localStorage has more links
            if (localCount > jsonCount) {
              const useLocal = window.confirm(
                `⚠️ Data Conflict Detected!\n\n` +
                `Browser: ${localCount} links (${new Date(localData.lastUpdated).toLocaleString()})\n` +
                `Server: ${jsonCount} links (${new Date(jsonData.lastUpdated).toLocaleString()})\n\n` +
                `Your browser has ${localCount - jsonCount} more links.\n\n` +
                `Click OK to keep browser data (recommended)\n` +
                `Click Cancel to use server data (will lose browser-only links)`
              );
              if (useLocal) {
                setLinks(localData.links || []);
                setDataWarning({
                  message: `Using browser data. Save to sync ${localCount - jsonCount} links to server.`,
                  localCount,
                  jsonCount
                });
              } else {
                setLinks(jsonData.links || []);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(jsonData));
              }
            } else {
              setLinks(jsonData.links || []);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(jsonData));
            }
          }
        } else {
          setLinks(jsonData.links || []);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(jsonData));
        }
        return;
      }
    } catch (error) {
      console.warn('Could not load from JSON, falling back to localStorage:', error);
    }

    // Fallback to localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      setLinks(data.links || []);
    }
  }, []);

  // Save to file
  const saveToFile = useCallback(async (updatedLinks) => {
    const data = {
      links: updatedLinks,
      lastUpdated: new Date().toISOString()
    };

    // Save to localStorage first
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    // Then try to save to file
    const isProduction = !window.location.hostname.includes('localhost');

    try {
      const response = await fetch('http://localhost:3001/api/save-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to save to server');
      }

      // Success - clear any errors and warnings
      setSaveError(null);
      setDataWarning(null);
      console.log(`✅ Saved ${updatedLinks.length} links to server`);
    } catch (error) {
      console.error('Could not save to server:', error);

      if (isProduction) {
        console.log('✓ Changes saved to browser localStorage (server sync not available on static hosting)');
      } else {
        // Show persistent error banner instead of alert
        setSaveError({
          message: `Save failed! ${updatedLinks.length} links saved to browser only.`,
          details: 'API server not responding. Start it with: npm run dev:save',
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }
  }, []);

  // Load archive metadata
  const loadArchivesList = useCallback(async () => {
    try {
      const metadata = await loadArchiveMetadata();
      setArchives(metadata);
    } catch (error) {
      console.error('Error loading archive metadata:', error);
    }
  }, []);

  // Load a specific archive year
  const loadArchive = useCallback(async (year) => {
    if (loadedArchives.has(year)) {
      return; // Already loaded
    }

    try {
      const archiveLinks = await loadArchiveYear(year);
      setLinks(currentLinks => [...currentLinks, ...archiveLinks]);
      setLoadedArchives(prev => new Set([...prev, year]));
      console.log(`Loaded ${archiveLinks.length} links from ${year} archive`);
    } catch (error) {
      console.error(`Error loading archive ${year}:`, error);
    }
  }, [loadedArchives]);

  // Load all archives at once
  const loadAllArchives = useCallback(async () => {
    for (const archive of archives) {
      await loadArchive(archive.year);
    }
  }, [archives, loadArchive]);

  // Auto-backup to localStorage backup key (overwrites each time)
  const performAutoBackup = useCallback(() => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const backupData = {
        ...JSON.parse(data),
        backupTimestamp: new Date().toISOString()
      };
      localStorage.setItem(`${STORAGE_KEY}_backup`, JSON.stringify(backupData));
      console.log(`🔄 Auto-backup: ${backupData.links?.length || 0} links backed up at ${new Date().toLocaleTimeString()}`);
    }
  }, []);

  // Set up auto-backup interval (every 5 minutes)
  useEffect(() => {
    // Only run auto-backup for admin users in dev mode
    const isProduction = !window.location.hostname.includes('localhost');
    if (isProduction) return;

    // Initial backup after 30 seconds
    const initialBackup = setTimeout(() => {
      performAutoBackup();
    }, 30000);

    // Then every 5 minutes
    autoBackupRef.current = setInterval(() => {
      performAutoBackup();
    }, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialBackup);
      if (autoBackupRef.current) {
        clearInterval(autoBackupRef.current);
      }
    };
  }, [performAutoBackup]);

  // Initialize
  // Load initial data and URL parameters
  useEffect(() => {
    loadLinks();
    loadArchivesList();
    const urlParams = new URLSearchParams(window.location.search);
    const adminParam = urlParams.get('admin');
    // Clean the admin parameter - remove any trailing special characters or whitespace
    const cleanAdmin = adminParam ? adminParam.replace(/[?&#\s]+$/, '') : '';
    setIsAdmin(cleanAdmin === ADMIN_USER);

    // Load tag filters from URL
    const tagParam = urlParams.get('tag');
    if (tagParam) {
      setSelectedTags([tagParam]);
    }
  }, [loadLinks]);

  // Update URL when tags change
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    // Preserve admin parameter
    const adminParam = urlParams.get('admin');
    const newParams = new URLSearchParams();
    if (adminParam) {
      newParams.set('admin', adminParam);
    }

    // Add tag parameter if tags are selected
    if (selectedTags.length === 1) {
      newParams.set('tag', selectedTags[0]);
    }

    // Update URL without reload
    const newUrl = newParams.toString() ? `?${newParams.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [selectedTags]);

  // Fetch URL metadata
  const fetchUrlMetadata = async (url) => {
    try {
      const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error('Failed to fetch metadata');
      const data = await response.json();

      if (data.status === 'success' && data.data) {
        return {
          title: data.data.title || '',
          description: data.data.description || '',
          image: data.data.image?.url || '',
          favicon: data.data.logo?.url || ''
        };
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }

    // Fallback - wrap in try-catch for invalid URLs
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return { title: domain, description: '', image: '', favicon: '' };
    } catch (urlError) {
      console.error('Invalid URL:', url, urlError);
      return { title: url, description: '', image: '', favicon: '' };
    }
  };

  // Add link
  const addLink = async () => {
    if (!newLink.url || !newLink.source) return;

    if (newLink.source.length > MAX_TITLE_LENGTH) {
      alert(`Title must be less than ${MAX_TITLE_LENGTH} characters`);
      return;
    }

    // Use tags array directly (from chip system), plus any pending input
    const pendingTag = currentTagInput.trim().toLowerCase();
    const finalTags = pendingTag && !newLink.tags?.includes(pendingTag)
      ? [...(newLink.tags || []), pendingTag]
      : (newLink.tags || []);

    // Build clean link object - exclude UI-only fields like tagInput
    const link = {
      id: Date.now(),
      url: newLink.url,
      source: newLink.source,
      pullQuote: newLink.pullQuote || '',
      tags: finalTags,
      isPinned: newLink.isPinned || false,
      timestamp: new Date().toISOString(),
      visits: 0
    };

    const updatedLinks = [...links, link];

    try {
      await saveToFile(updatedLinks);
      setNewLink({ url: '', source: '', pullQuote: '', tags: [], tagInput: '', isPinned: false });
      setCurrentTagInput('');
      if (editingLink) {
        setEditingLink(null);
      }
    } catch (error) {
      console.error('Failed to add link:', error);
    }
  };

  // Update link
  const updateLink = async () => {
    if (!editingLink || !isAdmin) return;

    // Use tags array directly (from chip system), plus any pending input
    const pendingTag = currentTagInput.trim().toLowerCase();
    const finalTags = pendingTag && !newLink.tags?.includes(pendingTag)
      ? [...(newLink.tags || []), pendingTag]
      : (newLink.tags || []);

    // Build clean updated link object - exclude UI-only fields like tagInput
    const updatedLinkData = {
      id: editingLink.id,
      url: newLink.url,
      source: newLink.source,
      pullQuote: newLink.pullQuote || '',
      tags: finalTags,
      isPinned: newLink.isPinned || false,
      timestamp: editingLink.timestamp,
      visits: editingLink.visits || 0
    };

    const updatedLinks = links.map(link =>
      link.id === editingLink.id ? updatedLinkData : link
    );

    try {
      await saveToFile(updatedLinks);
      setEditingLink(null);
      setNewLink({ url: '', source: '', pullQuote: '', tags: [], tagInput: '', isPinned: false });
      setCurrentTagInput('');
    } catch (error) {
      console.error('Failed to update link:', error);
    }
  };

  // Edit link
  const editLink = useCallback((link) => {
    if (!isAdmin) return;
    setEditingLink(link);
    setNewLink({ ...link, pullQuote: link.pullQuote || '', tags: link.tags || [], tagInput: '' });
    setCurrentTagInput('');
    setShowQuickAdd(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isAdmin]);

  // Delete link
  const deleteLink = async (id) => {
    if (!confirm('Delete this link?')) return;
    const updatedLinks = links.filter(l => l.id !== id);
    setLinks(updatedLinks);
    await saveToFile(updatedLinks);
  };

  // Toggle pin
  const togglePin = async (id) => {
    const updatedLinks = links.map(link =>
      link.id === id ? { ...link, isPinned: !link.isPinned } : link
    );
    setLinks(updatedLinks);
    await saveToFile(updatedLinks);
  };

  // Export links
  const exportLinks = () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
      const dateStr = timestamp[0];
      const timeStr = timestamp[1].split('-').slice(0, 2).join('-');

      const dataStr = JSON.stringify({
        links,
        lastUpdated: new Date().toISOString(),
        exportedAt: new Date().toISOString(),
        totalLinks: links.length
      }, null, 2);

      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `link-blog-export-${dateStr}-${timeStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`✅ Exported ${links.length} links`);
    } catch (error) {
      console.error('❌ Export failed:', error);
      alert('Export failed. Please try again or check the console for details.');
    }
  };

  // Import links
  const importLinks = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('📥 Starting import of', file.name);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);

        if (!importedData.links || !Array.isArray(importedData.links)) {
          throw new Error('Invalid file format. Expected JSON with "links" array.');
        }

        console.log(`📊 File contains ${importedData.links.length} links`);

        const existingUrls = new Set(links.map(link => link.url));

        const validNewLinks = importedData.links.filter(link => {
          if (!link.url || !link.source) return false;
          return !existingUrls.has(link.url);
        }).map(link => ({
          ...link,
          id: link.id || Date.now() + Math.random(),
          timestamp: link.timestamp || new Date().toISOString(),
          visits: link.visits || 0,
          tags: Array.isArray(link.tags) ? link.tags : [],
          isPinned: Boolean(link.isPinned)
        }));

        const duplicates = importedData.links.length - validNewLinks.length;
        const message = validNewLinks.length > 0
          ? `Import ${validNewLinks.length} new links?${duplicates > 0 ? ` (${duplicates} duplicates will be skipped)` : ''}`
          : `No new links to import (${duplicates} duplicates found)`;

        if (validNewLinks.length === 0) {
          alert(message);
          console.log('ℹ️', message);
          return;
        }

        const confirmImport = window.confirm(message);
        if (confirmImport) {
          const mergedLinks = [...links, ...validNewLinks];

          try {
            setLinks(mergedLinks);
            await saveToFile(mergedLinks);

            const successMsg = `✅ Successfully imported ${validNewLinks.length} links!`;
            console.log(successMsg);
            alert(successMsg);

          } catch (error) {
            console.error('❌ Failed to save imported links:', error);
            setLinks(mergedLinks);
            alert(`⚠️ Imported ${validNewLinks.length} links to UI, but save failed. Check if API server is running.`);
          }
        }

      } catch (error) {
        console.error('❌ Import failed:', error);
        alert(`Import failed: ${error.message}`);
      }
    };

    reader.onerror = () => {
      console.error('❌ File reading failed');
      alert('Failed to read the file. Please try again.');
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  // Process multiple URLs
  const processUrlsFromPaste = useCallback(async (urls) => {
    const urlList = urls.split('\n').map(url => url.trim()).filter(url => url);
    const processed = [];

    for (const url of urlList) {
      const metadata = await fetchUrlMetadata(url);
      const suggestedTags = suggestTagsFromUrl(url, metadata.title, metadata.description);

      processed.push({
        url,
        source: (metadata.title || url).slice(0, MAX_TITLE_LENGTH),
        pullQuote: '',
        tags: suggestedTags.slice(0, 5),
        metadata
      });
    }

    return processed;
  }, []);

  // Add quick links
  const addQuickLinks = async () => {
    if (!quickAddUrls.trim()) return;

    setIsLoading(true);
    try {
      const linksToAdd = await processUrlsFromPaste(quickAddUrls);

      const newLinks = linksToAdd.map(link => ({
        id: Date.now() + Math.random(),
        url: link.url,
        source: link.source,
        pullQuote: link.pullQuote || '',
        tags: link.tags,
        timestamp: new Date().toISOString(),
        visits: 0
      }));

      const updatedLinks = [...newLinks, ...links];
      setLinks(updatedLinks);
      await saveToFile(updatedLinks);

      setQuickAddUrls('');
      setShowQuickAdd(false);
    } catch (error) {
      console.error('Failed to add links:', error);
      alert('Failed to add some links');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy link
  const copyLink = async (link) => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedLinkId(link.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagCounts = {};
    links.forEach(link => {
      (link.tags || []).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }, [links]);

  // Filtered autocomplete tags
  const filteredAutocompleteTags = useMemo(() => {
    if (!currentTagInput.trim()) return [];

    const searchTerm = currentTagInput.trim().toLowerCase();
    const existingTags = (newLink.tags || []).map(t => t.toLowerCase());

    return allTags
      .filter(({ tag }) =>
        tag.toLowerCase().startsWith(searchTerm) &&
        !existingTags.includes(tag.toLowerCase())
      )
      .slice(0, 8);
  }, [currentTagInput, allTags, newLink.tags]);

  // Filter and sort links - uses deferred values for non-blocking UI
  const filteredAndSortedLinks = useMemo(() => {
    let filtered = links;

    // Search filter (uses deferred value for smoother typing)
    if (deferredSearchTerm) {
      const term = deferredSearchTerm.toLowerCase();
      filtered = filtered.filter(link =>
        link.source.toLowerCase().includes(term) ||
        link.url.toLowerCase().includes(term) ||
        (link.pullQuote && link.pullQuote.toLowerCase().includes(term)) ||
        (link.tags && link.tags.some(tag => tag.toLowerCase().includes(term)))
      );
    }

    // Tag filter (uses deferred value)
    if (deferredSelectedTags.length > 0) {
      filtered = filtered.filter(link =>
        link.tags && deferredSelectedTags.every(tag => link.tags.includes(tag))
      );
    }

    // Sort
    return [...filtered].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;

      switch (sortBy) {
        case SORT_OPTIONS.DATE_ASC:
          return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
        case SORT_OPTIONS.TITLE:
          return a.source.localeCompare(b.source);
        case SORT_OPTIONS.DATE_DESC:
        default:
          return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
      }
    });
  }, [links, deferredSearchTerm, deferredSelectedTags, sortBy]);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Save Error Banner */}
      {saveError && (
        <div className="sticky top-0 z-50 bg-red-600 text-white px-4 py-3 shadow-lg">
          <div className="container-width flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-medium">{saveError.message}</p>
                <p className="text-sm text-red-100">{saveError.details}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-red-200">{saveError.timestamp}</span>
              <button
                onClick={() => setSaveError(null)}
                className="p-1 hover:bg-red-700 rounded"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Warning Banner */}
      {dataWarning && (
        <div className="sticky top-0 z-50 bg-amber-500 text-amber-950 px-4 py-3 shadow-lg">
          <div className="container-width flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="font-medium">{dataWarning.message}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  saveToFile(links);
                }}
                className="px-3 py-1 bg-amber-700 text-white rounded text-sm font-medium hover:bg-amber-800"
              >
                Sync Now
              </button>
              <button
                onClick={() => setDataWarning(null)}
                className="p-1 hover:bg-amber-600 rounded"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header - Always visible for admins, hidden in minimal view for regular users */}
      {(!isMinimalView || isAdmin) && (
        <header className="sticky top-0 z-20 bg-white border-b-2 border-neutral-900">
          <div className="container-width">
            {/* Classic Newspaper Masthead */}
            <div className="py-3 md:py-4">
              {/* Top rule */}
              <div className="border-t border-neutral-300 mb-3"></div>

              {/* Main masthead row */}
              <div className="flex items-center justify-between">
                {/* Left: Est. date */}
                <div className="hidden sm:block text-xs tracking-wide text-neutral-500 uppercase">
                  Est. 1994
                </div>

                {/* Center: Title block */}
                <div className="flex-1 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <a
                      href="https://mediaeater.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-80 transition-opacity"
                      title="mediaeater.com"
                    >
                      <img
                        src="https://mediaeater.com/Images/mediaeater.png"
                        alt="mediaeater"
                        className="w-8 h-8 md:w-10 md:h-10 object-contain"
                      />
                    </a>
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold tracking-tight text-neutral-900">
                      <a href="/" className="hover:text-blue-800 transition-colors">newsfeeds.net</a>
                    </h1>
                  </div>
                  <div className="text-xs md:text-sm tracking-widest uppercase text-amber-700 mt-1">
                    Human Edited & Curated
                  </div>
                </div>

                {/* Right: Search icon */}
                <div className="hidden sm:block">
                  {searchExpanded ? (
                    <div className="relative w-40">
                      <input
                        ref={searchRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onBlur={() => {
                          if (!searchTerm) {
                            setTimeout(() => setSearchExpanded(false), 150);
                          }
                        }}
                        placeholder="Search..."
                        className={`w-full px-3 py-1.5 text-sm border border-neutral-300 rounded focus:outline-none focus:border-neutral-500 ${isSearchPending ? 'opacity-70' : ''}`}
                        aria-label="Search links"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setSearchExpanded(true)}
                      className="p-2 text-neutral-500 hover:text-neutral-700 transition-colors"
                      aria-label="Open search"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom info row */}
              <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-neutral-300 text-xs text-neutral-600">
                <a href="/feed.xml" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 transition-colors">RSS</a>
                <span className="text-neutral-300">|</span>
                <a href="/data/feed.json" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 transition-colors">JSON</a>
                <span className="text-neutral-300">|</span>
                <a href="/data/blogroll.opml" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 transition-colors">OPML</a>
                <span className="text-neutral-300">|</span>
                <button
                  onClick={() => setShowTicker(prev => !prev)}
                  className={`hover:text-neutral-900 transition-colors ${showTicker ? 'text-neutral-900 font-medium' : ''}`}
                >
                  {showTicker ? 'Ticker ●' : 'Ticker'}
                </button>
                <span className="text-neutral-300">|</span>
                <a href="https://ghuneim.com" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 transition-colors">mediaeater.inc</a>
              </div>

              {/* Mobile search */}
              <div className="sm:hidden mt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search links..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:border-neutral-500"
                    aria-label="Search links"
                  />
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Admin Panel - Always visible for admins */}
      {isAdmin && (
        <div className="bg-white border-b border-neutral-200">
          <div className="container-width py-6">
            {/* Tab buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setShowQuickAdd(false)}
                className={`btn btn-sm ${!showQuickAdd ? 'btn-primary' : 'btn-ghost'}`}
              >
                {editingLink ? <Edit2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {editingLink ? 'Edit Link' : 'Add Single Link'}
              </button>
              <button
                onClick={() => {
                  setShowQuickAdd(true);
                  setEditingLink(null);
                }}
                className={`btn btn-sm ${showQuickAdd ? 'btn-primary' : 'btn-ghost'}`}
              >
                <Upload className="w-4 h-4 mr-2" />
                Bulk Add URLs
              </button>

              <button
                onClick={exportLinks}
                className="btn btn-sm btn-outline"
                title={`Export all ${links.length} links to JSON file`}
              >
                <Download className="w-4 h-4 mr-2" />
                Export ({links.length})
              </button>

              <label className="btn btn-sm btn-outline cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={importLinks}
                  className="hidden"
                  title="Import links from JSON file"
                />
              </label>
            </div>

            {/* Single Link Form */}
            {!showQuickAdd && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com"
                      value={newLink.url}
                      onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Title ({newLink.source.length}/{MAX_TITLE_LENGTH})
                    </label>
                    <input
                      type="text"
                      placeholder="Link title or description"
                      value={newLink.source}
                      onChange={(e) => setNewLink({ ...newLink, source: e.target.value })}
                      maxLength={MAX_TITLE_LENGTH}
                      className="input w-full"
                    />
                  </div>
                </div>

                {newLink.url && (!newLink.source || newLink.tags.length === 0) && (
                  <button
                    onClick={async () => {
                      const metadata = await fetchUrlMetadata(newLink.url);
                      const suggestedTags = suggestTagsFromUrl(newLink.url, metadata.title, metadata.description);
                      setNewLink(prev => {
                        const newTags = prev.tags.length === 0 ? suggestedTags.slice(0, 5) : prev.tags;
                        return {
                          ...prev,
                          source: prev.source || (metadata.title || newLink.url).slice(0, MAX_TITLE_LENGTH),
                          tags: newTags,
                          tagInput: newTags.join(', ')
                        };
                      });
                    }}
                    className="btn btn-sm btn-secondary"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Auto-fetch title & tags
                  </button>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Pull Quote (optional)
                  </label>
                  <textarea
                    placeholder="Interesting quote or note about this link..."
                    value={newLink.pullQuote || ''}
                    onChange={(e) => setNewLink({ ...newLink, pullQuote: e.target.value })}
                    className="input w-full h-20"
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium mb-1">
                    Tags <span className="text-neutral-400 font-normal">(Tab to add suggestion)</span>
                  </label>

                  {/* Tag chips display */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(newLink.tags || []).map((tag, index) => (
                      <span
                        key={`${tag}-${index}`}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => {
                            const updatedTags = newLink.tags.filter((_, i) => i !== index);
                            setNewLink({
                              ...newLink,
                              tags: updatedTags,
                              tagInput: ''
                            });
                          }}
                          className="text-blue-600 hover:text-blue-900 ml-0.5"
                          aria-label={`Remove ${tag}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Tag input */}
                  <input
                    ref={tagInputRef}
                    type="text"
                    placeholder={newLink.tags?.length ? "Add another tag..." : "Type to add tags..."}
                    value={currentTagInput}
                    onChange={(e) => {
                      const value = e.target.value;

                      // Check if user typed a comma - add current tag
                      if (value.endsWith(',')) {
                        const tagToAdd = value.slice(0, -1).trim().toLowerCase();
                        if (tagToAdd && !newLink.tags?.includes(tagToAdd)) {
                          setNewLink({
                            ...newLink,
                            tags: [...(newLink.tags || []), tagToAdd],
                            tagInput: ''
                          });
                        }
                        setCurrentTagInput('');
                        setShowAutocomplete(false);
                        setAutocompleteIndex(0);
                        return;
                      }

                      setCurrentTagInput(value);
                      setShowAutocomplete(value.trim().length > 0);
                      setAutocompleteIndex(0);
                    }}
                    onFocus={() => {
                      if (currentTagInput.trim().length > 0) {
                        setShowAutocomplete(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        // Add current input as tag if not empty
                        const tagToAdd = currentTagInput.trim().toLowerCase();
                        if (tagToAdd && !newLink.tags?.includes(tagToAdd)) {
                          setNewLink({
                            ...newLink,
                            tags: [...(newLink.tags || []), tagToAdd],
                            tagInput: ''
                          });
                        }
                        setCurrentTagInput('');
                        setShowAutocomplete(false);
                      }, 200);
                    }}
                    onKeyDown={(e) => {
                      // Escape - close dropdown
                      if (e.key === 'Escape') {
                        setShowAutocomplete(false);
                        return;
                      }

                      // Tab - add first/selected suggestion or current input
                      if (e.key === 'Tab' && currentTagInput.trim()) {
                        e.preventDefault();
                        let tagToAdd;

                        if (showAutocomplete && filteredAutocompleteTags.length > 0) {
                          tagToAdd = filteredAutocompleteTags[autocompleteIndex]?.tag;
                        } else {
                          tagToAdd = currentTagInput.trim().toLowerCase();
                        }

                        if (tagToAdd && !newLink.tags?.includes(tagToAdd)) {
                          setNewLink({
                            ...newLink,
                            tags: [...(newLink.tags || []), tagToAdd],
                            tagInput: ''
                          });
                        }
                        setCurrentTagInput('');
                        setShowAutocomplete(false);
                        setAutocompleteIndex(0);
                        return;
                      }

                      // Enter - add current input or selected suggestion
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        let tagToAdd;

                        if (showAutocomplete && filteredAutocompleteTags.length > 0) {
                          tagToAdd = filteredAutocompleteTags[autocompleteIndex]?.tag;
                        } else {
                          tagToAdd = currentTagInput.trim().toLowerCase();
                        }

                        if (tagToAdd && !newLink.tags?.includes(tagToAdd)) {
                          setNewLink({
                            ...newLink,
                            tags: [...(newLink.tags || []), tagToAdd],
                            tagInput: ''
                          });
                        }
                        setCurrentTagInput('');
                        setShowAutocomplete(false);
                        setAutocompleteIndex(0);
                        return;
                      }

                      // Arrow down - navigate suggestions
                      if (e.key === 'ArrowDown' && showAutocomplete) {
                        e.preventDefault();
                        setAutocompleteIndex(prev =>
                          Math.min(prev + 1, filteredAutocompleteTags.length - 1)
                        );
                        return;
                      }

                      // Arrow up - navigate suggestions
                      if (e.key === 'ArrowUp' && showAutocomplete) {
                        e.preventDefault();
                        setAutocompleteIndex(prev => Math.max(prev - 1, 0));
                        return;
                      }

                      // Backspace - remove last tag if input is empty
                      if (e.key === 'Backspace' && !currentTagInput && newLink.tags?.length > 0) {
                        const updatedTags = newLink.tags.slice(0, -1);
                        setNewLink({
                          ...newLink,
                          tags: updatedTags,
                          tagInput: ''
                        });
                      }
                    }}
                    className="input w-full"
                  />

                  {/* Autocomplete dropdown */}
                  {showAutocomplete && filteredAutocompleteTags.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border-2 border-blue-500 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredAutocompleteTags.map(({ tag, count }, index) => (
                        <button
                          key={tag}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            if (!newLink.tags?.includes(tag)) {
                              setNewLink({
                                ...newLink,
                                tags: [...(newLink.tags || []), tag],
                                tagInput: ''
                              });
                            }
                            setCurrentTagInput('');
                            setShowAutocomplete(false);
                            setAutocompleteIndex(0);
                            tagInputRef.current?.focus();
                          }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between border-b border-gray-100 last:border-b-0 ${
                            index === autocompleteIndex
                              ? 'bg-blue-100 text-blue-900'
                              : 'hover:bg-blue-50'
                          }`}
                        >
                          <span className="font-medium">{tag}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {count}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Popular tags */}
                  {allTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 items-center">
                      <span className="text-xs text-neutral-500">Popular:</span>
                      {allTags.slice(0, 10).map(({ tag }) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (!newLink.tags?.includes(tag)) {
                              setNewLink({
                                ...newLink,
                                tags: [...(newLink.tags || []), tag],
                                tagInput: ''
                              });
                            }
                          }}
                          disabled={newLink.tags?.includes(tag)}
                          className={`tag text-xs ${newLink.tags?.includes(tag) ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newLink.isPinned || false}
                      onChange={(e) => setNewLink({ ...newLink, isPinned: e.target.checked })}
                      className="rounded border-neutral-300"
                    />
                    <span className="text-sm">Pin to top</span>
                  </label>

                  <div className="flex gap-2 ml-auto">
                    {editingLink && (
                      <button
                        onClick={() => {
                          setEditingLink(null);
                          setNewLink({ url: '', source: '', pullQuote: '', tags: [], tagInput: '', isPinned: false });
                        }}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={editingLink ? updateLink : addLink}
                      disabled={!newLink.url || !newLink.source}
                      className="btn btn-primary"
                    >
                      {editingLink ? 'Update Link' : 'Add Link'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Add Form */}
            {showQuickAdd && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Add Multiple URLs (one per line)
                  </label>
                  <textarea
                    ref={quickPasteRef}
                    value={quickAddUrls}
                    onChange={(e) => setQuickAddUrls(e.target.value)}
                    placeholder="Paste URLs here..."
                    className="input w-full h-32 font-mono text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addQuickLinks}
                    disabled={!quickAddUrls.trim() || isLoading}
                    className="btn btn-primary"
                  >
                    {isLoading ? 'Processing...' : 'Add All Links'}
                  </button>
                  <button
                    onClick={() => {
                      setShowQuickAdd(false);
                      setQuickAddUrls('');
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container-width section-y">
        <div className="space-y-3">
          {/* Elegant Header: Count | Legend | Date */}
          <div className="flex items-center justify-between text-sm mb-6 pb-4 border-b border-neutral-200">
            {/* Left: Link count with minimal view toggle */}
            <button
              onClick={() => setIsMinimalView(!isMinimalView)}
              className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 transition-colors font-medium"
              title={isMinimalView ? "Show full view" : "Show minimal view"}
            >
              <span>{filteredAndSortedLinks.length}:{links.length}</span>
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform duration-200 ${isMinimalView ? 'rotate-90' : ''}`}
              />
            </button>

            {/* Center: Legend (collapsible, no chevron) */}
            {!isMinimalView && (
              <button
                onClick={() => setIsLegendExpanded(!isLegendExpanded)}
                className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 transition-colors"
                title="Toggle legend"
              >
                <Info className="w-3.5 h-3.5" />
                <span className="font-medium">Legend</span>
              </button>
            )}

            {/* Right: Date stamp */}
            {!isMinimalView && (
              <time className="text-neutral-500 font-normal" dateTime={new Date().toISOString()}>
                {new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </time>
            )}
          </div>

          {/* Legend Content (expandable) */}
          {!isMinimalView && isLegendExpanded && (
            <div className="legend-box mb-6">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div className="legend-item">
                  <span className="font-medium text-neutral-700">Title:</span> Source/article name
                </div>
                <div className="legend-item">
                  <span className="font-medium text-neutral-700">URL:</span> Domain shown below title
                </div>
                <div className="legend-item">
                  <span className="font-medium text-neutral-700">Quote:</span> Pull quote or excerpt
                </div>
                <div className="legend-item">
                  <span className="font-medium text-neutral-700">Tags:</span> Click to filter or bookmark a topic
                </div>
                <div className="legend-item">
                  <span className="font-medium text-neutral-700">Date:</span> When link was added
                </div>
              </div>
            </div>
          )}

          {/* Archive Loader */}
          {archives.length > 0 && (
            <div className="mb-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-neutral-600" />
                  <span className="font-medium text-neutral-900">Archives</span>
                  <span className="text-sm text-neutral-500">
                    ({archives.reduce((sum, a) => sum + a.count, 0)} archived links)
                  </span>
                </div>
                <button
                  onClick={() => setShowArchives(!showArchives)}
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  {showArchives ? 'Hide' : 'Show'}
                </button>
              </div>

              {showArchives && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {archives.map(archive => (
                      <button
                        key={archive.year}
                        onClick={() => loadArchive(archive.year)}
                        disabled={loadedArchives.has(archive.year)}
                        className={`px-3 py-1.5 rounded text-sm transition-all ${
                          loadedArchives.has(archive.year)
                            ? 'bg-green-100 text-green-800 cursor-default'
                            : 'bg-white border border-neutral-300 hover:border-primary-500 hover:bg-primary-50'
                        }`}
                      >
                        {archive.year} ({archive.count})
                        {loadedArchives.has(archive.year) && ' ✓'}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={loadAllArchives}
                    disabled={loadedArchives.size === archives.length}
                    className="w-full px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {loadedArchives.size === archives.length
                      ? 'All Archives Loaded'
                      : 'Load All Archives'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Links List */}
          {filteredAndSortedLinks.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-neutral-500">No links found</p>
            </div>
          ) : (
            filteredAndSortedLinks.map((link, index) => (
              <article
                key={link.id}
                ref={(el) => linkRefs.current[index] = el}
                className={`link-card group ${
                  focusedLinkIndex === index ? 'ring-2 ring-primary-500 ring-offset-2' : ''
                }`}
              >
                <div className="flex gap-4">
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      {link.isPinned && (
                        <Pin className="w-4 h-4 text-neutral-400 mt-1 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-neutral-900 truncate">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary-600 transition-colors"
                            onClick={() => {
                              // Track visit if admin
                              if (isAdmin) {
                                const updatedLinks = links.map(l =>
                                  l.id === link.id
                                    ? { ...l, visits: (l.visits || 0) + 1 }
                                    : l
                                );
                                setLinks(updatedLinks);
                                saveToFile(updatedLinks);
                              }
                            }}
                          >
                            {link.source}
                          </a>
                        </h3>
                        <p className="text-sm text-neutral-500 truncate">
                          {(() => {
                            try {
                              return new URL(link.url).hostname.replace('www.', '');
                            } catch {
                              return link.url;
                            }
                          })()}
                        </p>
                      </div>
                    </div>

                    {/* Pull Quote */}
                    {link.pullQuote && (
                      <div className="mt-2 text-sm text-neutral-600 italic space-y-2">
                        {link.pullQuote.split('\n\n').map((paragraph, i) => (
                          <p key={i}>
                            {paragraph.split('\n').map((line, j, arr) => (
                              <span key={j}>
                                {line}
                                {j < arr.length - 1 && <br />}
                              </span>
                            ))}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Tags */}
                    {link.tags && link.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {link.tags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => {
                              if (selectedTags.includes(tag)) {
                                setSelectedTags(selectedTags.filter(t => t !== tag));
                              } else {
                                setSelectedTags([...selectedTags, tag]);
                              }
                            }}
                            className="tag"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="mt-3 flex items-center gap-4 text-xs text-neutral-400">
                      <span>
                        {new Date(link.timestamp).toLocaleDateString()}
                        {link.visits > 0 && ` [${link.visits}]`}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copyLink(link)}
                      className="btn-ghost p-2"
                      title="Copy link"
                    >
                      {copiedLinkId === link.id ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {isAdmin && (
                      <>
                        <button
                          onClick={() => editLink(link)}
                          className="btn-ghost p-2"
                          title="Edit link"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => togglePin(link.id)}
                          className="btn-ghost p-2"
                          title="Pin link"
                        >
                          <Pin className={`w-4 h-4 ${link.isPinned ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => deleteLink(link.id)}
                          className="btn-ghost p-2 text-error"
                          title="Delete link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </main>

      {/* Times Square-style news ticker - landscape mobile or manual toggle */}
      <NewsTicker links={filteredAndSortedLinks} forceShow={showTicker} onClose={() => setShowTicker(false)} />
    </div>
  );
}