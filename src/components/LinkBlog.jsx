import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Tag, Plus, X, Pin, Edit, Trash2, Rss, Search, ArrowUpDown, Download, Upload, Eye, Link2, Zap, Hash, ExternalLink, Copy, Info, FileText } from 'lucide-react';
import { suggestTagsFromUrl } from '../utils/tagSuggestions';
import BookmarkImporter from './BookmarkImporter';

// Use environment variable for admin password, fallback to demo password for public users
const ADMIN_USER = import.meta.env.VITE_ADMIN_PASSWORD || 'YourNewPassword';
const MAX_TITLE_LENGTH = 120;
const SORT_OPTIONS = {
  DATE_DESC: 'date-desc',
  DATE_ASC: 'date-asc',
  TITLE: 'title',
  TAG_RELEVANCE: 'tag-relevance',
  POPULARITY: 'popularity'
};

const LinkBlog = () => {
  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState({ url: '', source: '', pullQuote: '', tags: [], isPinned: false });
  const [currentTag, setCurrentTag] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // New state for enhanced features
  const [quickPasteUrls, setQuickPasteUrls] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.DATE_DESC);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [isProcessingUrls, setIsProcessingUrls] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [focusedLinkIndex, setFocusedLinkIndex] = useState(-1);
  const [expandedLinks, setExpandedLinks] = useState(new Set());
  const [showBookmarkImporter, setShowBookmarkImporter] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // Refs for keyboard navigation and quick paste
  const quickPasteRef = useRef(null);
  const searchRef = useRef(null);
  const linkRefs = useRef([]);
  const tagInputRef = useRef(null);

  // Utility functions for URL metadata fetching
  const fetchUrlMetadata = async (url) => {
    try {
      // For demo purposes, we'll use a simple CORS proxy or handle this on the backend
      // In a real app, you'd have a backend service to fetch metadata
      const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        return {
          title: data.data.title || '',
          description: data.data.description || '',
          image: data.data.image?.url || '',
          favicon: data.data.logo?.url || ''
        };
      }
    } catch (error) {
      console.error('Failed to fetch metadata for', url, error);
    }
    
    // Fallback: extract domain as title
    try {
      const domain = new URL(url).hostname;
      return {
        title: domain,
        description: '',
        image: '',
        favicon: ''
      };
    } catch {
      return {
        title: 'Unknown Link',
        description: '',
        image: '',
        favicon: ''
      };
    }
  };

  const processUrlsFromPaste = useCallback(async (urls) => {
    const urlList = urls.split('\n')
      .map(url => url.trim())
      .filter(url => url && (url.startsWith('http://') || url.startsWith('https://')));
    
    if (urlList.length === 0) return [];
    
    setIsProcessingUrls(true);
    const processed = [];
    
    for (const url of urlList) {
      const metadata = await fetchUrlMetadata(url);
      const suggestedTags = suggestTagsFromUrl(url, metadata.title, metadata.description);
      
      processed.push({
        url,
        source: metadata.title.slice(0, MAX_TITLE_LENGTH),
        description: metadata.description,
        pullQuote: '',
        image: metadata.image,
        favicon: metadata.favicon,
        tags: suggestedTags.slice(0, 5), // Auto-add top 5 suggested tags
        isPinned: false
      });
    }
    
    setIsProcessingUrls(false);
    return processed;
  }, []);

  // Load links - Always check JSON file first for newer data
  const loadLinks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Always fetch JSON file first to check for updates
      let jsonData = null;
      
      try {
        const basePath = import.meta.env.BASE_URL || '/';
        const timestamp = new Date().getTime();
        const url = `${basePath}data/links.json?t=${timestamp}`;
        
        const response = await fetch(url);
        if (response.ok) {
          jsonData = await response.json();
          console.log("Fetched JSON file:", jsonData);
          // Default to using JSON data
        }
      } catch (fetchError) {
        console.warn('Failed to fetch JSON file:', fetchError);
      }
      
      // Check localStorage
      let localData = null;
      try {
        const stored = localStorage.getItem('linkBlogData');
        if (stored) {
          localData = JSON.parse(stored);
          console.log("Found localStorage data:", localData);
        }
      } catch (parseError) {
        console.warn('Failed to parse localStorage:', parseError);
      }
      
      // Determine which data source to use
      let dataToUse = null;
      
      if (jsonData && jsonData.links && Array.isArray(jsonData.links)) {
        if (localData && localData.lastUpdated && jsonData.lastUpdated) {
          // Compare timestamps - use whichever is newer
          const jsonTime = new Date(jsonData.lastUpdated).getTime();
          const localTime = new Date(localData.lastUpdated).getTime();
          
          if (localTime > jsonTime) {
            console.log("Using localStorage (newer):", localData.lastUpdated, "vs JSON:", jsonData.lastUpdated);
            dataToUse = localData;
          } else {
            console.log("Using JSON file (newer):", jsonData.lastUpdated, "vs localStorage:", localData.lastUpdated);
            dataToUse = jsonData;
          }
        } else {
          // No localStorage or no timestamp - use JSON
          console.log("Using JSON file (no comparison possible)");
          dataToUse = jsonData;
        }
      } else if (localData && localData.links && Array.isArray(localData.links)) {
        // JSON failed but localStorage exists
        console.log("Using localStorage (JSON unavailable)");
        dataToUse = localData;
      }
      
      // Apply the chosen data
      if (dataToUse) {
        setLinks(dataToUse.links);
        setLastUpdated(dataToUse.lastUpdated || null);
        
        // Update localStorage if we used JSON data
        if (dataToUse === jsonData) {
          localStorage.setItem('linkBlogData', JSON.stringify(jsonData));
        }
      } else {
        // No data available from either source
        console.log("No data available - initializing empty");
        setLinks([]);
        setLastUpdated(null);
      }
      
    } catch (error) {
      console.error('Error loading links:', error);
      setError(error.message);
      setLinks([]);
      setLastUpdated(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save links to localStorage and server
  const saveToFile = useCallback(async (updatedLinks) => {
    try {
      if (!Array.isArray(updatedLinks)) {
        throw new Error('Updated links must be an array');
      }

      const sortedLinks = [...updatedLinks].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
        return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
      });

      const data = {
        lastUpdated: new Date().toISOString(),
        links: sortedLinks,
        version: '1.0',
      };

      console.log("Saving data:", `${sortedLinks.length} links`);
      
      // Save to localStorage first
      const testData = JSON.stringify(data);
      if (testData.length > 5000000) { // ~5MB limit check
        throw new Error('Data size exceeds localStorage limit');
      }
      
      localStorage.setItem('linkBlogData', testData);

      // Try to save to server (for local development)
      try {
        const response = await fetch('http://localhost:3001/api/save-links', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: testData
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Saved to server:', result.message);
        } else {
          console.log('⚠️ Server save failed, but localStorage saved successfully');
        }
      } catch (serverError) {
        // Server might not be running, that's okay - we still have localStorage
        console.log('ℹ️ Server not available - saved to localStorage only');
      }

      // Update state only after successful save
      setLinks(sortedLinks);
      setLastUpdated(data.lastUpdated);
      
      console.log(`Successfully saved ${sortedLinks.length} links`);
    } catch (error) {
      console.error('Error saving links:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to save changes. ';
      if (error.name === 'QuotaExceededError') {
        errorMessage += 'Storage quota exceeded. Consider removing some links.';
      } else if (error.message.includes('localStorage')) {
        errorMessage += 'localStorage is not available. Changes will not persist.';
      } else {
        errorMessage += 'Please try again. Check console for details.';
      }
      
      alert(errorMessage);
      throw error; // Re-throw so calling functions know it failed
    }
  }, []);

  const trackLinkVisit = useCallback(async (linkId) => {
    if (!isAdmin) return;

    const updatedLinks = links.map(link =>
      link.id === linkId
        ? { ...link, visits: (link.visits || 0) + 1, lastVisited: new Date().toISOString() }
        : link
    );
    try {
      await saveToFile(updatedLinks);
    } catch (error) {
      console.error('Failed to track link visit:', error);
      // Don't show alert for visit tracking failures as it would be annoying
    }
  }, [isAdmin, links, saveToFile]);

  // Memoize the keyboard handler to avoid creating new function on every render
  const handleKeyDown = useCallback((e) => {
    // Cmd/Ctrl+K to focus search (works everywhere)
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
      return;
    }

    // Cmd/Ctrl+V to focus quick paste area
    if ((e.metaKey || e.ctrlKey) && e.key === 'v' && isAdmin) {
      e.preventDefault();
      setShowQuickAdd(true);
      setTimeout(() => quickPasteRef.current?.focus(), 100);
      return;
    }

    // Escape to clear focus or close quick add
    if (e.key === 'Escape') {
      if (showQuickAdd) {
        setShowQuickAdd(false);
      } else if (focusedLinkIndex >= 0) {
        setFocusedLinkIndex(-1);
      } else if (document.activeElement !== document.body) {
        document.activeElement.blur();
      }
      return;
    }

    // J/K navigation (input fields are already filtered out)
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        const maxIndex = Math.max(0, links.length - 1);
        setFocusedLinkIndex(prev => {
          const newIndex = prev >= maxIndex ? 0 : prev + 1; // Wrap to beginning
          // Scroll focused link into view
          setTimeout(() => {
            linkRefs.current[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
          return newIndex;
        });
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        const maxIndex = Math.max(0, links.length - 1);
        setFocusedLinkIndex(prev => {
          const newIndex = prev <= 0 ? maxIndex : prev - 1; // Wrap to end
          // Scroll focused link into view
          setTimeout(() => {
            linkRefs.current[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
          return newIndex;
        });
      } else if (e.key === 'Enter' && focusedLinkIndex >= 0) {
        e.preventDefault();
        const link = links[focusedLinkIndex];
        if (link) {
          trackLinkVisit(link.id);
          window.open(link.url, '_blank');
        }
      }
  }, [isAdmin, focusedLinkIndex, showQuickAdd, trackLinkVisit, links]);

  useEffect(() => {
    loadLinks();
    const urlParams = new URLSearchParams(window.location.search);
    setIsAdmin(urlParams.get('admin') === ADMIN_USER);
    
  }, [loadLinks]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const keydownHandler = (e) => {
      // Allow Cmd/Ctrl+K to work even in input fields
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        handleKeyDown(e);
        return;
      }

      // Immediately return for any input, textarea, or contenteditable element
      if (e.target.matches('input, textarea, [contenteditable]')) {
        return;
      }
      handleKeyDown(e);
    };

    document.addEventListener('keydown', keydownHandler);
    return () => document.removeEventListener('keydown', keydownHandler);
  }, [handleKeyDown]);

  const addLink = async () => {
    if (newLink.url && newLink.source && isAdmin) {
      if (newLink.source.length > MAX_TITLE_LENGTH) {
        alert(`Title must be less than ${MAX_TITLE_LENGTH} characters`);
        return;
      }
      const updatedLinks = [
        ...links,
        { 
          ...newLink, 
          id: Date.now(),
          timestamp: new Date().toISOString(),
          visits: 0
        },
      ];
      
      try {
        await saveToFile(updatedLinks);
        setNewLink({ url: '', source: '', pullQuote: '', tags: [], isPinned: false });
        setCurrentTag(''); // Clear the current tag input after adding
      } catch (error) {
        // Error is already handled in saveToFile, just don't reset form
        console.error('Failed to add link:', error);
      }
    }
  };
  
  const addQuickLinks = async () => {
    if (!quickPasteUrls.trim() || !isAdmin) return;
    
    const processedUrls = await processUrlsFromPaste(quickPasteUrls);
    if (processedUrls.length === 0) {
      alert('No valid URLs found. Please paste URLs starting with http:// or https://');
      return;
    }
    
    const newLinks = processedUrls.map(linkData => ({
      ...linkData,
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      visits: 0
    }));
    
    const updatedLinks = [...links, ...newLinks];
    
    try {
      await saveToFile(updatedLinks);
      setQuickPasteUrls('');
      setPreviewUrls([]);
      setShowQuickAdd(false);
    } catch (error) {
      console.error('Failed to add quick links:', error);
    }
  };
  
  const previewQuickUrls = useCallback(async () => {
    if (!quickPasteUrls.trim()) {
      setPreviewUrls([]);
      return;
    }
    
    const processed = await processUrlsFromPaste(quickPasteUrls);
    setPreviewUrls(processed);
  }, [quickPasteUrls, processUrlsFromPaste]);

  const deleteLink = useCallback(async (id) => {
    if (!isAdmin) return;
    if (window.confirm('Are you sure you want to delete this link?')) {
      const updatedLinks = links.filter(link => link.id !== id);
      try {
        await saveToFile(updatedLinks);
      } catch (error) {
        console.error('Failed to delete link:', error);
      }
    }
  }, [isAdmin, links, saveToFile]);

  const editLink = useCallback((link) => {
    if (!isAdmin) return;
    setEditingLink(link);
    setNewLink({ ...link, pullQuote: link.pullQuote || '' });
    setCurrentTag(''); // Clear the current tag input when editing
  }, [isAdmin]);

  const updateLink = async () => {
    if (!editingLink || !isAdmin) return;
    const updatedLinks = links.map(link => 
      link.id === editingLink.id ? { ...newLink, timestamp: new Date().toISOString() } : link
    );
    
    try {
      await saveToFile(updatedLinks);
      setEditingLink(null);
      setNewLink({ url: '', source: '', tags: [], isPinned: false });
      setCurrentTag(''); // Clear the current tag input after updating
    } catch (error) {
      console.error('Failed to update link:', error);
    }
  };

  const togglePin = useCallback(async (id) => {
    if (!isAdmin) return;
    const updatedLinks = links.map(link => {
      if (link.id === id) {
        return { ...link, isPinned: !link.isPinned };
      }
      return link;
    });
    try {
      await saveToFile(updatedLinks);
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  }, [isAdmin, links, saveToFile]);

  const addTag = () => {
    const tagToAdd = currentTag.trim().toLowerCase(); // Normalize tag
    if (tagToAdd && newLink.tags.length < 10 && !newLink.tags.map(tag => tag.toLowerCase()).includes(tagToAdd)) {
      setNewLink(prevLink => ({
        ...prevLink,
        tags: [...prevLink.tags, tagToAdd]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setNewLink(prevLink => ({
      ...prevLink,
      tags: prevLink.tags.filter(tag => tag !== tagToRemove)
    }));
  };
  
  const toggleTagFilter = useCallback((tag) => {
    console.log('toggleTagFilter called with:', tag); // Debug log
    // Normalize the tag for consistent comparison
    const normalizedTag = tag.trim().toLowerCase();

    setSelectedTags(prev => {
      // If clicking the same tag that's already the only selection, deselect it
      if (prev.length === 1 && prev[0].toLowerCase() === normalizedTag) {
        console.log('Deselecting tag:', normalizedTag);
        return [];
      }

      // Otherwise, replace selection with just this tag
      console.log('Selecting only tag:', normalizedTag);
      return [normalizedTag];
    });
  }, []);
  
  const clearFilters = () => {
    setSelectedTags([]);
    setSearchTerm('');
  };
  
  const exportLinks = () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
      const dateStr = timestamp[0];
      const timeStr = timestamp[1].split('-').slice(0, 2).join('-');

      const dataStr = JSON.stringify({
        links,
        lastUpdated,
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

      // Show success message
      const successMsg = `✅ Exported ${links.length} links`;
      console.log(successMsg);
      // You could add a toast notification here

    } catch (error) {
      console.error('❌ Export failed:', error);
      alert('Export failed. Please try again or check the console for details.');
    }
  };
  
  const importLinks = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('📥 Starting import of', file.name);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);

        // Validate file structure
        if (!importedData.links || !Array.isArray(importedData.links)) {
          throw new Error('Invalid file format. Expected JSON with "links" array.');
        }

        console.log(`📊 File contains ${importedData.links.length} links`);

        // Create a set of existing URLs for quick lookup
        const existingUrls = new Set(links.map(link => link.url));

        // Filter out duplicates and validate each link
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
            await saveLinks(mergedLinks);

            const successMsg = `✅ Successfully imported ${validNewLinks.length} links!`;
            console.log(successMsg);
            alert(successMsg);

          } catch (error) {
            console.error('❌ Failed to save imported links:', error);

            // Still update the UI even if API save fails
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
    event.target.value = ''; // Reset file input
  };
  
  const handleBookmarkImport = useCallback((importedLinks) => {
    saveToFile(importedLinks);
    setShowBookmarkImporter(false);
  }, [saveToFile]);
  

  const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    if (includeTime) {
      options.hour = 'numeric';
      options.minute = '2-digit';
      options.timeZoneName = 'short';
      options.timeZone = 'America/New_York';
    }
    return date.toLocaleString('en-US', options);
  };
  
  const formatShortDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear().toString().slice(-2);
    return `${month}-${day}-${year}`;
  };
  
  // Compute filtered and sorted links
  const filteredAndSortedLinks = useMemo(() => {
    let filtered = links;
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(link => 
        link.source.toLowerCase().includes(term) ||
        link.url.toLowerCase().includes(term) ||
        (link.description && link.description.toLowerCase().includes(term)) ||
        (link.pullQuote && link.pullQuote.toLowerCase().includes(term)) ||
        (link.tags && link.tags.some(tag => tag.toLowerCase().includes(term)))
      );
    }
    
    // Tag filter - case-insensitive and trim whitespace
    if (selectedTags.length > 0) {
      filtered = filtered.filter(link => {
        if (!link.tags || link.tags.length === 0) return false;

        // Normalize tags for comparison (trim and lowercase)
        const normalizedLinkTags = link.tags.map(tag => tag.trim().toLowerCase());
        const normalizedSelectedTags = selectedTags.map(tag => tag.trim().toLowerCase());

        // Check if all selected tags are present in the link's tags
        return normalizedSelectedTags.every(selectedTag =>
          normalizedLinkTags.includes(selectedTag)
        );
      });
    }
    
    // Sort
    const sorted = [...filtered].sort((a, b) => {
      // Always show pinned links first
      if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
      
      switch (sortBy) {
        case SORT_OPTIONS.DATE_ASC:
          return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
        case SORT_OPTIONS.TITLE:
          return a.source.localeCompare(b.source);
        case SORT_OPTIONS.POPULARITY:
          return (b.visits || 0) - (a.visits || 0);
        case SORT_OPTIONS.TAG_RELEVANCE: {
          const aTagCount = a.tags ? a.tags.length : 0;
          const bTagCount = b.tags ? b.tags.length : 0;
          return bTagCount - aTagCount;
        }
        case SORT_OPTIONS.DATE_DESC:
        default:
          return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
      }
    });
    
    return sorted;
  }, [links, searchTerm, selectedTags, sortBy]);
  
  // Get all unique tags with frequency
  const allTagsWithFrequency = useMemo(() => {
    const tagCount = {};
    links.forEach(link => {
      if (link.tags) {
        link.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      }
    });

    return Object.entries(tagCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [links]);

  // Filtered autocomplete suggestions
  const filteredAutocompleteTags = useMemo(() => {
    if (!currentTag.trim()) return [];

    const searchTerm = currentTag.trim().toLowerCase();
    const currentTagsLower = newLink.tags.map(t => t.toLowerCase());

    return allTagsWithFrequency
      .filter(({ tag }) => {
        const tagLower = tag.toLowerCase();
        return tagLower.includes(searchTerm) && !currentTagsLower.includes(tagLower);
      })
      .slice(0, 8); // Show max 8 suggestions
  }, [currentTag, allTagsWithFrequency, newLink.tags]);
  
  // Get related links for a given link
  const getRelatedLinks = useCallback((currentLink) => {
    if (!currentLink.tags || currentLink.tags.length === 0) return [];
    
    return links
      .filter(link => 
        link.id !== currentLink.id && 
        link.tags && 
        link.tags.some(tag => currentLink.tags.includes(tag))
      )
      .map(link => ({
        ...link,
        sharedTags: link.tags.filter(tag => currentLink.tags.includes(tag)).length
      }))
      .sort((a, b) => b.sharedTags - a.sharedTags)
      .slice(0, 3);
  }, [links]);
  
  
  // Memoize the preview function to prevent dependency issues
  const debouncedPreview = useCallback(() => {
    if (quickPasteUrls.trim()) {
      previewQuickUrls();
    }
  }, [quickPasteUrls, previewQuickUrls]);

  // Auto-preview on paste
  useEffect(() => {
    const timeoutId = setTimeout(debouncedPreview, 500);
    return () => clearTimeout(timeoutId);
  }, [debouncedPreview]);

  // Toggle link expansion
  const toggleLinkExpanded = (linkId) => {
    setExpandedLinks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(linkId)) {
        newSet.delete(linkId);
      } else {
        newSet.add(linkId);
      }
      return newSet;
    });
  };

  // Reset focused link index when filtered links change
  useEffect(() => {
    if (focusedLinkIndex >= filteredAndSortedLinks.length) {
      setFocusedLinkIndex(filteredAndSortedLinks.length > 0 ? 0 : -1);
    } else if (focusedLinkIndex >= 0 && filteredAndSortedLinks.length === 0) {
      setFocusedLinkIndex(-1);
    }
  }, [filteredAndSortedLinks, focusedLinkIndex]);

  // Update linkRefs array size when filtered links change
  useEffect(() => {
    linkRefs.current = linkRefs.current.slice(0, filteredAndSortedLinks.length);
  }, [filteredAndSortedLinks.length]);

  return (
    <div className="min-h-screen bg-white text-black">
    <div className="max-w-4xl mx-auto px-4 py-2 sm:p-4 font-mono">
      <header className="text-center mb-6 sm:mb-10">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <div className="flex flex-col items-start sm:items-center gap-2">
            <div className="flex items-center gap-3 sm:gap-4">
              <h1 className="text-xl font-mono text-black">
                newsfeeds.net
              </h1>
              <button
                onClick={() => {
                  if (expandedLinks.size === 0) {
                    // Expand all links
                    setExpandedLinks(new Set(links.map(link => link.id)));
                  } else {
                    // Collapse all links
                    setExpandedLinks(new Set());
                  }
                }}
                className="text-xl font-mono hover:opacity-70 transition-opacity cursor-pointer pl-2"
                title={expandedLinks.size === 0 ? 'Expand all links' : 'Collapse all links'}
              >
                {expandedLinks.size === 0 ? '+' : '−'}
              </button>
            </div>
            <div className="text-xs text-black">
              <a href="/data/feed.xml" target="_blank" rel="noopener noreferrer" className="hover:underline" title="Subscribe via RSS">RSS</a>
              {' / '}
              <a href="/data/feed.json" target="_blank" rel="noopener noreferrer" className="hover:underline" title="Subscribe via JSON Feed">JSON Feed</a>
              {' / '}
              <a href="/data/blogroll.opml" target="_blank" rel="noopener noreferrer" className="hover:underline" title="Import blogroll into your RSS reader">OPML</a>
            </div>
          </div>
          
          {isAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="btn-primary bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-xs sm:text-sm"
                title="Quick add URLs (Ctrl+V)"
              >
                <Zap size={12} className="sm:mr-1" />
                <span className="hidden sm:inline">Quick Add</span>
              </Button>

              <Button
                onClick={exportLinks}
                className="btn-primary bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-xs sm:text-sm"
                title={`Export all ${links.length} links to JSON file`}
              >
                <Download size={12} className="sm:mr-1" />
                <span className="hidden sm:inline">Export</span>
                <span className="text-[10px] opacity-80 ml-1">({links.length})</span>
              </Button>

              <label className="btn-primary bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-xs sm:text-sm cursor-pointer inline-flex items-center px-3 py-2 rounded-md font-medium transition-colors">
                <Upload size={12} className="sm:mr-1" />
                <span className="hidden sm:inline">Import</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={importLinks}
                  className="hidden"
                  title="Import links from JSON file"
                />
              </label>

            </div>
          )}
        </div>
        
        {lastUpdated && (
          <p className="text-sm text-black">
            Last updated: {formatDate(lastUpdated, true)}
          </p>
        )}

        {isAdmin && (
          <div className="mt-2 flex justify-center gap-2 flex-wrap">
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              Admin Mode
            </span>
            <button
              onClick={() => setShowBookmarkImporter(true)}
              className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded hover:bg-indigo-200"
              title="Import browser bookmarks"
            >
              <FileText size={12} className="inline mr-1" />
              Import Bookmarks
            </button>
          </div>
        )}
        
      </header>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Quick Add Section */}
      {isAdmin && showQuickAdd && (
        <Card className="mb-6 glass border-green-200/50 bg-gradient-to-br from-green-50/90 to-emerald-50/90">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Zap size={20} className="text-green-600" />
                Quick Add URLs
              </h2>
              <Button
                onClick={() => setShowQuickAdd(false)}
                className="bg-gray-500 hover:bg-gray-600 text-sm p-2"
              >
                <X size={14} />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Paste URLs (one per line)
                  <span className="text-xs text-gray-500 ml-2">Tip: Press Ctrl+V to focus here</span>
                </label>
                <textarea
                  ref={quickPasteRef}
                  value={quickPasteUrls}
                  onChange={(e) => setQuickPasteUrls(e.target.value)}
                  placeholder="https://example.com\nhttps://another-link.com\n..."
                  className="w-full h-24 p-3 border rounded-md font-mono text-sm bg-white border-gray-300 text-gray-900"
                />
              </div>
              
              {isProcessingUrls && (
                <div className="flex items-center gap-2 text-sm text-black">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  Processing URLs...
                </div>
              )}
              
              {previewUrls.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Preview ({previewUrls.length} links):</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {previewUrls.map((preview, index) => (
                      <div key={index} className="p-2 border rounded text-xs border-gray-200 bg-gray-50">
                        <div className="font-medium truncate">{preview.source || 'Loading...'}</div>
                        <div className="truncate text-gray-600">{preview.url}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  onClick={addQuickLinks}
                  disabled={!quickPasteUrls.trim() || isProcessingUrls}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus size={16} className="mr-1" />
                  Add {previewUrls.length > 0 ? previewUrls.length : ''} Links
                </Button>
                <Button
                  onClick={() => {
                    setQuickPasteUrls('');
                    setPreviewUrls([]);
                  }}
                  className="bg-gray-500 hover:bg-gray-600"
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Search and Filter Bar */}
      <div className="mb-4 sm:mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black" />
            <Input
              ref={searchRef}
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            <Info 
              size={16} 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-black cursor-help"
              title={`⌘/Ctrl+K to search, J/K to navigate, Enter to open, Esc to clear${isAdmin ? ', ⌘/Ctrl+V to quick add' : ''}`}
            />
          </div>
          
          
          {(searchTerm || selectedTags.length > 0) && (
            <Button
              onClick={clearFilters}
              className="bg-red-500 hover:bg-red-600 text-xs sm:text-sm px-2 sm:px-4"
            >
              <X size={12} className="sm:mr-1" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>
        {/* Keyboard shortcuts help - moved to info icon */}
      </div>

      {/* Traditional Add Link Form - only show when editing or no quick add */}
      {isAdmin && (editingLink || !showQuickAdd) && (
        <Card className="mb-6 glass">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {editingLink ? (
                <><Edit size={20} className="text-blue-600" />Edit Link</>
              ) : (
                <><Plus size={20} className="text-green-600" />Add New Link</>
              )}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">URL</label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={newLink.url}
                  onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Title ({newLink.source.length}/{MAX_TITLE_LENGTH})
                </label>
                <Input
                  type="text"
                  placeholder="Link title or description"
                  value={newLink.source}
                  onChange={(e) => setNewLink({ ...newLink, source: e.target.value })}
                  maxLength={MAX_TITLE_LENGTH}
                  className="w-full"
                />
                
                {newLink.url && (!newLink.source || newLink.tags.length === 0) && (
                  <Button
                    onClick={async () => {
                      const metadata = await fetchUrlMetadata(newLink.url);
                      const suggestedTags = suggestTagsFromUrl(newLink.url, metadata.title, metadata.description);
                      setNewLink(prev => ({ 
                        ...prev, 
                        source: prev.source || metadata.title.slice(0, MAX_TITLE_LENGTH),
                        tags: prev.tags.length === 0 ? suggestedTags.slice(0, 5) : prev.tags
                      }));
                    }}
                    className="mt-2 text-xs bg-blue-500 hover:bg-blue-600"
                  >
                    <Link2 size={12} className="mr-1" />
                    Auto-fetch title & tags
                  </Button>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Pull Quote (optional)
                </label>
                <textarea
                  placeholder="A memorable quote or key insight from the article..."
                  value={newLink.pullQuote}
                  onChange={(e) => {
                    const pullQuote = e.target.value;
                    setNewLink({ ...newLink, pullQuote });
                    // Auto-suggest tags from pull quote if it's long enough and tags are empty
                    if (pullQuote.length > 30 && newLink.tags.length === 0) {
                      const suggestedTags = suggestTagsFromUrl(newLink.url, newLink.source, pullQuote);
                      if (suggestedTags.length > 0) {
                        setNewLink(prev => ({ ...prev, pullQuote, tags: suggestedTags.slice(0, 3) }));
                      }
                    }
                  }}
                  className="w-full h-20 p-3 border rounded-md text-sm bg-white border-gray-300 text-gray-900"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(newLink.pullQuote || '').length}/500 characters - Tags can be inferred from the pull quote
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Tags</label>
                <div className="flex gap-2 mb-2 relative">
                  <input
                    type="text"
                    placeholder="Add tag (use comma to separate multiple)"
                    value={currentTag}
                    className="flex-1 h-9 w-full rounded-md border border-neutral-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:border-neutral-800 dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-300"
                    list="existing-tags"
                    onChange={(e) => {
                      const value = e.target.value;
                      console.log('Tag input onChange:', value); // Debug log

                      // Show autocomplete when typing
                      setShowAutocomplete(value.trim().length > 0);

                      // Check for commas first, then update state appropriately
                      if (value.includes(',')) {
                        const parts = value.split(',');

                        // Process all complete tags (before commas)
                        if (parts.length > 1) {
                          const tagsBeforeComma = parts.slice(0, -1)
                            .map(t => t.trim().toLowerCase())
                            .filter(t => t.length > 0);

                          const currentTagsLower = newLink.tags.map(t => t.toLowerCase());
                          const newTags = tagsBeforeComma.filter(t => !currentTagsLower.includes(t));

                          if (newTags.length > 0) {
                            const available = 10 - newLink.tags.length;
                            const toAdd = newTags.slice(0, available);

                            setNewLink(prev => ({
                              ...prev,
                              tags: [...prev.tags, ...toAdd]
                            }));
                          }

                          // Set input to text after last comma
                          const remaining = parts[parts.length - 1];
                          setCurrentTag(remaining);
                          setShowAutocomplete(remaining.trim().length > 0);
                        } else {
                          // Just a single comma at the end, update normally
                          setCurrentTag(value);
                        }
                      } else {
                        // No comma, update normally
                        setCurrentTag(value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowAutocomplete(false);
                        return;
                      }

                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();

                        // Add any remaining tag when Enter is pressed
                        const value = currentTag.trim().toLowerCase();
                        if (value && !newLink.tags.map(tag => tag.toLowerCase()).includes(value) && newLink.tags.length < 10) {
                          setNewLink(prevLink => ({
                            ...prevLink,
                            tags: [...prevLink.tags, value]
                          }));
                          setCurrentTag('');
                          setShowAutocomplete(false);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // Delay hiding autocomplete to allow click events on dropdown
                      setTimeout(() => {
                        setShowAutocomplete(false);
                      }, 200);

                      // Add any remaining tag when focus leaves
                      const value = currentTag.trim().toLowerCase();
                      if (value && !newLink.tags.map(tag => tag.toLowerCase()).includes(value) && newLink.tags.length < 10) {
                        setNewLink(prevLink => ({
                          ...prevLink,
                          tags: [...prevLink.tags, value]
                        }));
                        setCurrentTag('');
                      }
                    }}
                  />
                  <Button onClick={addTag} disabled={!currentTag || newLink.tags.length >= 10}>
                    <Plus size={16} />
                  </Button>

                  {/* Autocomplete dropdown */}
                  {showAutocomplete && filteredAutocompleteTags.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-12 mt-1 bg-white border-2 border-blue-500 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredAutocompleteTags.map(({ tag, count }) => (
                        <button
                          key={tag}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            if (!newLink.tags.includes(tag) && newLink.tags.length < 10) {
                              setNewLink(prev => ({ ...prev, tags: [...prev.tags, tag] }));
                              setCurrentTag('');
                              setShowAutocomplete(false);
                            }
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
                </div>

                <datalist id="existing-tags">
                  {allTagsWithFrequency.map(({tag}) => (
                    <option key={tag} value={tag} />
                  ))}
                </datalist>
                
                <div className="flex flex-wrap gap-2 mb-2">
                  {newLink.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"
                    >
                      <Tag size={10} />
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="text-black hover:text-gray-700"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                
                {/* Tag suggestions */}
                {allTagsWithFrequency.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Popular tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {allTagsWithFrequency.slice(0, 10).map(({tag}) => (
                        <button
                          key={tag}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!newLink.tags.includes(tag) && newLink.tags.length < 10) {
                              setNewLink(prev => ({ ...prev, tags: [...prev.tags, tag] }));
                            }
                          }}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${
                            newLink.tags.includes(tag)
                              ? 'bg-blue-100 border-blue-300 text-blue-800'
                              : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                          }`}
                          disabled={newLink.tags.includes(tag) || newLink.tags.length >= 10}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinned"
                  checked={newLink.isPinned}
                  onChange={(e) => setNewLink({ ...newLink, isPinned: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="pinned" className="text-sm font-medium flex items-center gap-1">
                  <Pin size={14} />
                  Pin to top
                </label>
              </div>
              
              <div className="flex gap-2">
                {editingLink ? (
                  <>
                    <Button onClick={updateLink} className="bg-blue-600 hover:bg-blue-700">
                      <Edit size={14} className="mr-1" />
                      Update Link
                    </Button>
                    <Button 
                      onClick={() => {
                        setEditingLink(null);
                        setNewLink({ url: '', source: '', pullQuote: '', tags: [], isPinned: false });
                        setCurrentTag(''); // Clear the current tag input when canceling
                      }}
                      className="bg-gray-500 hover:bg-gray-600"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={addLink} className="bg-green-600 hover:bg-green-700">
                    <Plus size={14} className="mr-1" />
                    Add Link
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {/* Loading skeleton cards */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="link-card p-4">
              <div className="skeleton h-6 w-3/4 mb-3"></div>
              <div className="skeleton h-4 w-1/2 mb-3"></div>
              <div className="flex gap-2">
                <div className="skeleton h-6 w-16 rounded-full"></div>
                <div className="skeleton h-6 w-20 rounded-full"></div>
                <div className="skeleton h-6 w-18 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedLinks.length === 0 ? (
            <Card className="glass">
              <CardContent className="text-center py-8 text-gray-500">
                {links.length === 0 
                  ? `No links yet. ${isAdmin ? 'Add some links above to get started!' : ''}` 
                  : 'No links match your current filters.'
                }
              </CardContent>
            </Card>
          ) : (
            filteredAndSortedLinks.map((link, index) => {
              const isHighlighted = index === focusedLinkIndex;
              const relatedLinks = getRelatedLinks(link);
              const isExpanded = expandedLinks.has(link.id);
              
              return (
                <Card 
                  key={link.id} 
                  ref={el => linkRefs.current[index] = el}
                  className={`link-card ${
                    isHighlighted 
                      ? 'ring-2 ring-blue-500 shadow-lg' 
                      : ''
                  }`}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {/* Blue Chevron Toggle */}
                          <button
                            onClick={() => toggleLinkExpanded(link.id)}
                            className="text-blue-500 hover:text-blue-600 transition-colors"
                            title={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                          
                          {link.isPinned && (
                            <Pin size={14} className="text-orange-500 fill-current" title="Pinned" />
                          )}
                          {link.favicon && (
                            <img src={link.favicon} alt="" className="w-4 h-4" onError={(e) => e.target.style.display = 'none'} />
                          )}
                          <h3 className="font-medium text-lg flex-1">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => trackLinkVisit(link.id)}
                              className="hover:underline transition-colors text-black hover:text-gray-700"
                            >
                              {link.source}
                              <ExternalLink size={12} className="inline ml-1 opacity-50" />
                            </a>
                          </h3>
                          
                          {/* Visit counter */}
                          {isAdmin && link.visits > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600" title="Visit count">
                              <Eye size={10} className="inline mr-1" />
                              {link.visits}
                            </span>
                          )}
                        </div>
                        
                        {/* Expanded Content */}
                        {isExpanded && (
                          <>
                            {link.description && (
                              <p className="text-sm mb-2 text-black">
                                {link.description}
                              </p>
                            )}
                            
                            <div className="text-xs mb-2 flex items-center gap-2 text-black">
                              <span className="break-all">
                                {link.url} {link.timestamp && `Added: ${formatDate(link.timestamp)}`}
                              </span>
                              <button
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(link.url);
                                  } catch (err) {
                                    console.error('Failed to copy URL:', err);
                                  }
                                }}
                                className="p-1 rounded transition-colors flex-shrink-0 hover:bg-gray-100 text-black hover:text-gray-700"
                                title="Copy URL"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                            
                            {/* Pull Quote */}
                            {link.pullQuote && (
                              <div className="my-3 p-3 border-l-4 border-blue-500 bg-blue-50">
                                <blockquote className="text-sm italic text-gray-700">
                                  &quot;{link.pullQuote}&quot;
                                </blockquote>
                              </div>
                            )}
                            
                            {/* Related Links */}
                            {relatedLinks.length > 0 && (
                              <div className="mt-3 pt-3">
                                <h4 className="text-xs font-medium mb-2 text-black">
                                  Related reading:
                                </h4>
                                <div className="space-y-1">
                                  {relatedLinks.map(relatedLink => (
                                    <div key={relatedLink.id} className="flex items-center gap-2">
                                      <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                                      <a
                                        href={relatedLink.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => trackLinkVisit(relatedLink.id)}
                                        className="text-xs hover:underline text-black"
                                      >
                                        {relatedLink.source} ({formatShortDate(relatedLink.timestamp)})
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* Tags - Only visible when expanded */}
                        {isExpanded && link.tags && link.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {link.tags.map((tag, tagIndex) => (
                              <button
                                key={tagIndex}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleTagFilter(tag);
                                }}
                                className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 transition-all hover:scale-105 ${
                                  selectedTags.includes(tag)
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                                title="Click to filter by this tag"
                              >
                                <Tag size={8} />
                                {tag}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-start gap-1 sm:gap-2 sm:ml-4 mt-2 sm:mt-0">
                        {isAdmin && (
                          <div className="flex flex-row sm:flex-col gap-1">
                            <button
                              onClick={() => togglePin(link.id)}
                              className={`p-1 rounded transition-colors ${
                                link.isPinned 
                                  ? 'text-orange-500 hover:text-orange-600' 
                                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                              }`}
                              title={link.isPinned ? 'Unpin' : 'Pin to top'}
                            >
                              <Pin size={12} className={link.isPinned ? 'fill-current' : ''} />
                            </button>
                            <button
                              onClick={() => editLink(link)}
                              className="p-1 rounded transition-colors text-black hover:text-gray-700 hover:bg-gray-100"
                              title="Edit link"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={() => deleteLink(link.id)}
                              className="p-1 rounded transition-colors text-red-500 hover:text-red-600 hover:bg-gray-100"
                              title="Delete link"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
      
      {showBookmarkImporter && (
        <BookmarkImporter
          onImport={handleBookmarkImport}
          existingLinks={links}
          onClose={() => setShowBookmarkImporter(false)}
        />
      )}
      </div>
    </div>
  );
};

export default LinkBlog;
