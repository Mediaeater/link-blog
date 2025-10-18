import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Copy,
  Check,
  Filter,
  Info
} from 'lucide-react';
import { suggestTagsFromUrl } from '../utils/tagSuggestions';

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

  const searchRef = useRef(null);
  const quickPasteRef = useRef(null);
  const linkRefs = useRef({});

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

        // Use the most recent data
        if (localData && localData.lastUpdated && jsonData.lastUpdated) {
          const jsonTime = new Date(jsonData.lastUpdated).getTime();
          const localTime = new Date(localData.lastUpdated).getTime();

          if (localTime > jsonTime) {
            setLinks(localData.links || []);
          } else {
            setLinks(jsonData.links || []);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(jsonData));
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
    try {
      const response = await fetch('http://localhost:3001/api/save-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to save to server');
      }
    } catch (error) {
      console.error('Could not save to server:', error);
      alert('Changes saved locally. Server save failed.');
      throw error;
    }
  }, []);

  // Initialize
  // Load initial data and URL parameters
  useEffect(() => {
    loadLinks();
    const urlParams = new URLSearchParams(window.location.search);
    setIsAdmin(urlParams.get('admin') === ADMIN_USER);

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

    const link = {
      id: Date.now(),
      ...newLink,
      timestamp: new Date().toISOString(),
      visits: 0
    };

    const updatedLinks = [...links, link];

    try {
      await saveToFile(updatedLinks);
      setNewLink({ url: '', source: '', pullQuote: '', tags: [], tagInput: '', isPinned: false });
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
    const updatedLinks = links.map(link =>
      link.id === editingLink.id ? { ...newLink, id: editingLink.id, timestamp: new Date().toISOString() } : link
    );

    try {
      await saveToFile(updatedLinks);
      setEditingLink(null);
      setNewLink({ url: '', source: '', pullQuote: '', tags: [], tagInput: '', isPinned: false });
    } catch (error) {
      console.error('Failed to update link:', error);
    }
  };

  // Edit link
  const editLink = useCallback((link) => {
    if (!isAdmin) return;
    setEditingLink(link);
    setNewLink({ ...link, pullQuote: link.pullQuote || '', tagInput: link.tags ? link.tags.join(', ') : '' });
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

  // Filter and sort links
  const filteredAndSortedLinks = useMemo(() => {
    let filtered = links;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(link =>
        link.source.toLowerCase().includes(term) ||
        link.url.toLowerCase().includes(term) ||
        (link.pullQuote && link.pullQuote.toLowerCase().includes(term)) ||
        (link.tags && link.tags.some(tag => tag.toLowerCase().includes(term)))
      );
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(link =>
        link.tags && selectedTags.every(tag => link.tags.includes(tag))
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
  }, [links, searchTerm, selectedTags, sortBy]);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-neutral-200">
        <div className="container-width">
          <div className="py-4 flex items-center justify-between gap-4">
            {/* Logo/Title */}
            <div>
              <h1 className="text-xl font-semibold text-blue-700">newsfeeds.net</h1>
              <div className="text-xs text-amber-700 font-medium mt-0.5">human edited and curated</div>
              <div className="text-xs text-neutral-600 mt-1 space-y-1">
                <div>
                  <a href="/feed.xml" target="_blank" rel="noopener noreferrer" className="hover:underline">RSS</a>
                  {' / '}
                  <a href="/data/feed.json" target="_blank" rel="noopener noreferrer" className="hover:underline">JSON Feed</a>
                  {' / '}
                  <a href="/data/blogroll.opml" target="_blank" rel="noopener noreferrer" className="hover:underline">OPML</a>
                </div>
                <div>
                  <a href="https://ghuneim.com" target="_blank" rel="noopener noreferrer" className="hover:underline">(c)mediaeater.inc 2025</a>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search links..."
                  className="input w-full pl-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">

              {!isAdmin && links.length === 0 && (
                <div className="text-sm text-neutral-500">
                  No links yet. Add ?admin=password to URL to manage.
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Admin Panel */}
      {isAdmin && (
        <div className="bg-white border-b border-neutral-200">
          <div className="container-width py-6">
            {/* Tab buttons */}
            <div className="flex gap-2 mb-4">
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
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="tag1, tag2, tag3"
                    value={newLink.tagInput || ''}
                    onChange={(e) => {
                      const inputValue = e.target.value;

                      // Get the text after the last comma to use for autocomplete
                      const parts = inputValue.split(',');
                      const lastPart = parts[parts.length - 1].trim();
                      setCurrentTagInput(lastPart);
                      setShowAutocomplete(lastPart.length > 0);

                      setNewLink({
                        ...newLink,
                        tagInput: inputValue
                      });
                    }}
                    onFocus={() => {
                      const parts = (newLink.tagInput || '').split(',');
                      const lastPart = parts[parts.length - 1].trim();
                      setCurrentTagInput(lastPart);
                      setShowAutocomplete(lastPart.length > 0);
                    }}
                    onBlur={(e) => {
                      setTimeout(() => {
                        setShowAutocomplete(false);
                        // Process tags when input loses focus
                        const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                        setNewLink({
                          ...newLink,
                          tags: tags,
                          tagInput: tags.join(', ')
                        });
                      }, 200);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowAutocomplete(false);
                        return;
                      }
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                        setNewLink({
                          ...newLink,
                          tags: tags,
                          tagInput: tags.join(', ')
                        });
                        setShowAutocomplete(false);
                      }
                    }}
                    className="input w-full"
                  />

                  {/* Autocomplete dropdown */}
                  {showAutocomplete && filteredAutocompleteTags.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border-2 border-blue-500 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredAutocompleteTags.map(({ tag, count }) => (
                        <button
                          key={tag}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const parts = (newLink.tagInput || '').split(',');
                            parts[parts.length - 1] = tag;
                            const updatedInput = parts.join(', ');
                            const updatedTags = updatedInput.split(',').map(t => t.trim()).filter(Boolean);
                            setNewLink({
                              ...newLink,
                              tagInput: updatedInput + ', ',
                              tags: updatedTags
                            });
                            setShowAutocomplete(false);
                            setCurrentTagInput('');
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between border-b border-gray-100 last:border-b-0"
                        >
                          <span className="font-medium text-gray-900">{tag}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {count}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {allTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-xs text-neutral-500">Popular:</span>
                      {allTags.slice(0, 10).map(({ tag }) => (
                        <button
                          key={tag}
                          onClick={() => {
                            const currentTags = newLink.tags || [];
                            if (!currentTags.includes(tag)) {
                              const updatedTags = [...currentTags, tag];
                              setNewLink({
                                ...newLink,
                                tags: updatedTags,
                                tagInput: updatedTags.join(', ')
                              });
                            }
                          }}
                          className="tag text-xs"
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
          {/* Stats & Legend */}
          <div className="flex items-center justify-between text-sm text-neutral-500 mb-6">
            <span>
              {filteredAndSortedLinks.length}:{links.length}
            </span>
            <span>
              {selectedTags.length > 0 && `Filtered by topic: ${selectedTags.join(', ')}`}
            </span>
          </div>

          {/* Legend */}
          <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg shadow-sm">
            <div className="text-xs space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-blue-600" />
                <div className="font-bold text-blue-900 text-sm">Reading Guide</div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-blue-900">
                <div><span className="font-semibold text-blue-700">Title:</span> Source/article name</div>
                <div><span className="font-semibold text-blue-700">URL:</span> Domain shown below title</div>
                <div><span className="font-semibold text-blue-700">Quote:</span> Pull quote or excerpt</div>
                <div><span className="font-semibold text-blue-700">Tags:</span> Click to filter (URL updates)</div>
                <div><span className="font-semibold text-blue-700">Date:</span> When link was added</div>
                <div><span className="font-semibold text-blue-700">Visits:</span> Count in brackets [N]</div>
              </div>
              <div className="mt-3 pt-2 border-t border-blue-200 text-blue-800">
                <span className="font-semibold">💡 Tip:</span> Click any tag to filter. The URL updates so you can bookmark or share the filtered view!
              </div>
            </div>
          </div>

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
                      <p className="mt-2 text-sm text-neutral-600 italic">
                        "{link.pullQuote}"
                      </p>
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
    </div>
  );
}