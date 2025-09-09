/**
 * Bookmark Import Utility
 * Parses browser bookmark exports (HTML format) and converts to link-blog format
 * Supports folder-based tagging and privacy filtering
 */

// Common public/shareable folder patterns to suggest for import
const SUGGESTED_PUBLIC_PATTERNS = [
  'development',
  'programming',
  'tech',
  'tools',
  'reference',
  'documentation',
  'tutorials',
  'articles',
  'resources',
  'learning',
  'projects',
  'opensource',
  'public'
];

// URL patterns that might be private (shown as warnings)
const PRIVATE_URL_PATTERNS = [
  'localhost',
  '127.0.0.1',
  '192.168.',
  '10.0.',
  'internal.',
  'intranet.',
  '.local',
  'file://'
];

/**
 * Parse HTML bookmark file and extract folder structure
 * @param {string} html - Raw HTML content from bookmark export
 * @returns {Object} Parsed bookmark structure with folders and links
 */
export function parseBookmarkHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const bookmarks = {
    folders: {},
    links: [],
    totalCount: 0
  };
  
  // Recursive function to parse nested bookmark structure
  function parseFolder(dlElement, folderPath = []) {
    const items = dlElement.children;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.tagName === 'DT') {
        const anchor = item.querySelector('a');
        const folderHeader = item.querySelector('h3');
        
        if (folderHeader) {
          // This is a folder
          const folderName = folderHeader.textContent.trim();
          const newPath = [...folderPath, folderName];
          const folderKey = newPath.join('/');
          
          // Initialize folder in structure
          if (!bookmarks.folders[folderKey]) {
            bookmarks.folders[folderKey] = {
              name: folderName,
              path: newPath,
              links: [],
              subfolders: [],
              count: 0
            };
          }
          
          // Look for nested DL element
          const nextElement = items[i + 1];
          if (nextElement && nextElement.tagName === 'DL') {
            parseFolder(nextElement, newPath);
            i++; // Skip the DL element we just processed
          }
        } else if (anchor) {
          // This is a bookmark
          const link = {
            url: anchor.href,
            title: anchor.textContent.trim(),
            addDate: anchor.getAttribute('add_date'),
            icon: anchor.getAttribute('icon'),
            folderPath: folderPath,
            tags: folderPath.map(f => normalizeTag(f))
          };
          
          // Add to current folder
          const folderKey = folderPath.join('/');
          if (folderPath.length > 0) {
            if (!bookmarks.folders[folderKey]) {
              bookmarks.folders[folderKey] = {
                name: folderPath[folderPath.length - 1],
                path: folderPath,
                links: [],
                subfolders: [],
                count: 0
              };
            }
            bookmarks.folders[folderKey].links.push(link);
            bookmarks.folders[folderKey].count++;
          } else {
            // Root level bookmark
            if (!bookmarks.folders['_root']) {
              bookmarks.folders['_root'] = {
                name: 'Unfiled Bookmarks',
                path: [],
                links: [],
                subfolders: [],
                count: 0
              };
            }
            bookmarks.folders['_root'].links.push(link);
            bookmarks.folders['_root'].count++;
          }
          
          bookmarks.links.push(link);
          bookmarks.totalCount++;
        }
      } else if (item.tagName === 'DL') {
        // Direct DL element (can happen at root)
        parseFolder(item, folderPath);
      }
    }
  }
  
  // Start parsing from root DL elements
  const rootDLs = doc.querySelectorAll('dl');
  rootDLs.forEach(dl => parseFolder(dl, []));
  
  return bookmarks;
}

/**
 * Preview bookmarks without exposing URLs
 * @param {string} html - Raw HTML content
 * @returns {Object} Folder structure with counts only
 */
export function previewBookmarks(html) {
  const parsed = parseBookmarkHTML(html);
  const preview = {
    folders: {},
    totalCount: parsed.totalCount,
    suggestedSelections: [],
    warningFolders: []
  };
  
  // Build preview structure with counts only
  Object.entries(parsed.folders).forEach(([path, folder]) => {
    const folderName = folder.name;
    const lowerName = folderName.toLowerCase();
    
    // Check if folder matches public/shareable patterns
    const isLikelyPublic = SUGGESTED_PUBLIC_PATTERNS.some(pattern => 
      lowerName.includes(pattern)
    );
    
    // Check for potential private content
    const hasPrivateUrls = folder.links.some(link => 
      PRIVATE_URL_PATTERNS.some(pattern => link.url.includes(pattern))
    );
    
    preview.folders[path] = {
      name: folder.name,
      path: folder.path,
      count: folder.count,
      isLikelyPublic,
      hasPrivateUrls,
      selected: isLikelyPublic && !hasPrivateUrls // Default: select only likely public folders
    };
    
    if (isLikelyPublic && !hasPrivateUrls) {
      preview.suggestedSelections.push(path);
    }
    
    if (hasPrivateUrls) {
      preview.warningFolders.push({
        path,
        reason: 'Contains local/internal URLs'
      });
    }
  });
  
  return preview;
}

/**
 * Import selected bookmarks with filtering
 * @param {string} html - Raw HTML content
 * @param {Array} selectedFolders - Array of folder paths to import
 * @param {Object} options - Import options
 * @returns {Array} Array of links ready for import
 */
export function importFilteredBookmarks(html, selectedFolders, options = {}) {
  const parsed = parseBookmarkHTML(html);
  const {
    excludePrivateUrls = true,
    mergeDuplicates = true,
    maxBatchSize = 1000
  } = options;
  
  let filteredLinks = [];
  
  // Get links from selected folders
  selectedFolders.forEach(folderPath => {
    const folder = parsed.folders[folderPath];
    if (folder && folder.links) {
      filteredLinks = filteredLinks.concat(folder.links);
    }
  });
  
  // Filter out private URL patterns if requested
  if (excludePrivateUrls) {
    filteredLinks = filteredLinks.filter(link => {
      const url = link.url.toLowerCase();
      return !PRIVATE_URL_PATTERNS.some(pattern => url.includes(pattern));
    });
  }
  
  // Convert to link-blog format
  const importReady = filteredLinks.map(bookmark => ({
    url: bookmark.url,
    source: truncateTitle(bookmark.title),
    pullQuote: '',
    tags: bookmark.tags.filter(tag => tag && tag.length > 0),
    isPinned: false,
    id: Date.now() + Math.random(),
    timestamp: bookmark.addDate ? 
      new Date(parseInt(bookmark.addDate) * 1000).toISOString() : 
      new Date().toISOString(),
    visits: 0
  }));
  
  // Limit batch size if specified
  if (maxBatchSize && importReady.length > maxBatchSize) {
    console.warn(`Limiting import to ${maxBatchSize} links (${importReady.length} available)`);
    return importReady.slice(0, maxBatchSize);
  }
  
  return importReady;
}

/**
 * Normalize folder name to tag format
 * @param {string} folderName - Original folder name
 * @returns {string} Normalized tag
 */
function normalizeTag(folderName) {
  return folderName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .replace(/^-|-$/g, '')     // Remove leading/trailing hyphens
    .slice(0, 30);             // Limit tag length
}

/**
 * Truncate title to maximum length
 * @param {string} title - Original title
 * @returns {string} Truncated title
 */
function truncateTitle(title) {
  const MAX_LENGTH = 120;
  if (title.length <= MAX_LENGTH) return title;
  return title.slice(0, MAX_LENGTH - 3) + '...';
}

/**
 * Detect duplicate URLs in existing links
 * @param {Array} newLinks - Links to import
 * @param {Array} existingLinks - Current links in system
 * @returns {Object} Analysis of duplicates and unique links
 */
export function analyzeDuplicates(newLinks, existingLinks) {
  const existingUrls = new Set(existingLinks.map(link => link.url));
  
  const duplicates = [];
  const unique = [];
  
  newLinks.forEach(link => {
    if (existingUrls.has(link.url)) {
      duplicates.push(link);
    } else {
      unique.push(link);
    }
  });
  
  return {
    duplicates,
    unique,
    duplicateCount: duplicates.length,
    uniqueCount: unique.length,
    totalCount: newLinks.length
  };
}

/**
 * Merge duplicate links by combining tags
 * @param {Array} newLinks - Links to import
 * @param {Array} existingLinks - Current links
 * @returns {Array} Merged link list
 */
export function mergeDuplicateLinks(newLinks, existingLinks) {
  const linkMap = new Map();
  
  // Add existing links to map
  existingLinks.forEach(link => {
    linkMap.set(link.url, { ...link });
  });
  
  // Merge or add new links
  newLinks.forEach(newLink => {
    if (linkMap.has(newLink.url)) {
      const existing = linkMap.get(newLink.url);
      // Merge tags
      const combinedTags = new Set([...existing.tags, ...newLink.tags]);
      existing.tags = Array.from(combinedTags);
      // Update title if existing is generic
      if (existing.source.includes(new URL(existing.url).hostname) && 
          !newLink.source.includes(new URL(newLink.url).hostname)) {
        existing.source = newLink.source;
      }
    } else {
      linkMap.set(newLink.url, newLink);
    }
  });
  
  return Array.from(linkMap.values());
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseBookmarkHTML,
    previewBookmarks,
    importFilteredBookmarks,
    analyzeDuplicates,
    mergeDuplicateLinks
  };
}