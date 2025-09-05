// Common tags that can be suggested based on URL patterns and content
export const COMMON_TAGS = [
  // Technology & Programming
  'javascript', 'react', 'nodejs', 'python', 'web-development', 'frontend', 'backend',
  'api', 'database', 'devops', 'github', 'open-source', 'tutorial', 'framework',
  'library', 'tools', 'css', 'html', 'typescript', 'vue', 'angular', 'svelte',
  
  // Content Types
  'article', 'blog', 'news', 'documentation', 'guide', 'reference', 'video',
  'podcast', 'book', 'paper', 'research', 'course', 'tutorial',
  
  // General Topics
  'ai', 'ml', 'machine-learning', 'data-science', 'blockchain', 'crypto',
  'security', 'privacy', 'performance', 'optimization', 'testing', 'design',
  'ux', 'ui', 'mobile', 'ios', 'android', 'cloud', 'aws', 'docker',
  
  // Media & Communication
  'social-media', 'marketing', 'business', 'startup', 'productivity',
  'automation', 'workflow', 'collaboration', 'remote-work',
  
  // Misc
  'interesting', 'useful', 'important', 'later', 'inspiration', 'example',
  'resource', 'collection', 'awesome'
];

// Domain-based tag suggestions
const DOMAIN_TAG_MAP = {
  'github.com': ['github', 'open-source', 'code'],
  'stackoverflow.com': ['stackoverflow', 'programming', 'help'],
  'medium.com': ['article', 'blog', 'medium'],
  'dev.to': ['article', 'blog', 'dev-community'],
  'youtube.com': ['video', 'youtube'],
  'twitter.com': ['twitter', 'social-media'],
  'linkedin.com': ['linkedin', 'professional', 'business'],
  'reddit.com': ['reddit', 'discussion', 'community'],
  'hackernews.com': ['hackernews', 'tech-news'],
  'news.ycombinator.com': ['hackernews', 'tech-news'],
  'techcrunch.com': ['news', 'tech-news', 'startup'],
  'wired.com': ['news', 'technology'],
  'arstechnica.com': ['news', 'technology'],
  'theverge.com': ['news', 'technology'],
  'smashingmagazine.com': ['web-development', 'design', 'tutorial'],
  'css-tricks.com': ['css', 'web-development', 'tutorial'],
  'codepen.io': ['frontend', 'css', 'javascript', 'demo'],
  'dribbble.com': ['design', 'inspiration', 'ui'],
  'behance.net': ['design', 'portfolio', 'creative'],
  'figma.com': ['design', 'tools', 'ui'],
  'notion.so': ['productivity', 'tools', 'workspace'],
  'vercel.com': ['deployment', 'frontend', 'tools'],
  'netlify.com': ['deployment', 'frontend', 'tools'],
  'aws.amazon.com': ['aws', 'cloud', 'infrastructure'],
  'cloud.google.com': ['gcp', 'cloud', 'infrastructure'],
  'azure.microsoft.com': ['azure', 'cloud', 'microsoft'],
  'docker.com': ['docker', 'containers', 'devops'],
  'kubernetes.io': ['kubernetes', 'containers', 'devops'],
  'npmjs.com': ['npm', 'javascript', 'package'],
  'pypi.org': ['python', 'package', 'pip']
};

// Keyword-based tag suggestions
const KEYWORD_TAG_MAP = {
  // Programming languages
  'javascript': ['javascript', 'web-development'],
  'python': ['python', 'programming'],
  'react': ['react', 'javascript', 'frontend'],
  'vue': ['vue', 'javascript', 'frontend'],
  'angular': ['angular', 'javascript', 'frontend'],
  'node': ['nodejs', 'javascript', 'backend'],
  'typescript': ['typescript', 'javascript'],
  'css': ['css', 'frontend', 'styling'],
  'html': ['html', 'frontend', 'web-development'],
  'sql': ['sql', 'database'],
  'mongodb': ['mongodb', 'database', 'nosql'],
  'postgresql': ['postgresql', 'database', 'sql'],
  'mysql': ['mysql', 'database', 'sql'],
  
  // Technologies
  'api': ['api', 'backend', 'integration'],
  'rest': ['api', 'rest', 'backend'],
  'graphql': ['graphql', 'api', 'backend'],
  'docker': ['docker', 'containers', 'devops'],
  'kubernetes': ['kubernetes', 'devops', 'containers'],
  'aws': ['aws', 'cloud', 'infrastructure'],
  'firebase': ['firebase', 'backend', 'google'],
  'redis': ['redis', 'cache', 'database'],
  'nginx': ['nginx', 'web-server', 'devops'],
  'apache': ['apache', 'web-server'],
  
  // Concepts
  'tutorial': ['tutorial', 'learning'],
  'guide': ['guide', 'tutorial'],
  'documentation': ['documentation', 'reference'],
  'cheatsheet': ['reference', 'cheatsheet'],
  'best practices': ['best-practices', 'guide'],
  'performance': ['performance', 'optimization'],
  'security': ['security', 'important'],
  'testing': ['testing', 'quality'],
  'deployment': ['deployment', 'devops'],
  'monitoring': ['monitoring', 'devops'],
  'analytics': ['analytics', 'data'],
  'machine learning': ['machine-learning', 'ai', 'data-science'],
  'artificial intelligence': ['ai', 'machine-learning'],
  'data science': ['data-science', 'analytics', 'python'],
  'blockchain': ['blockchain', 'crypto'],
  'cryptocurrency': ['crypto', 'blockchain'],
  
  // Content types
  'blog': ['blog', 'article'],
  'article': ['article', 'blog'],
  'video': ['video'],
  'course': ['course', 'learning'],
  'book': ['book', 'resource'],
  'podcast': ['podcast', 'audio'],
  'newsletter': ['newsletter'],
  'tool': ['tools', 'useful'],
  'library': ['library', 'code'],
  'framework': ['framework', 'code'],
  'plugin': ['plugin', 'extension'],
  'theme': ['theme', 'design'],
  'template': ['template', 'design']
};

/**
 * Suggests tags based on URL, title, and description
 * @param {string} url - The URL to analyze
 * @param {string} title - The title/source text
 * @param {string} description - The description text
 * @returns {string[]} Array of suggested tags
 */
export function suggestTagsFromUrl(url, title = '', description = '') {
  const suggestions = new Set();
  
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    const path = urlObj.pathname.toLowerCase();
    
    // Domain-based suggestions
    if (DOMAIN_TAG_MAP[domain]) {
      DOMAIN_TAG_MAP[domain].forEach(tag => suggestions.add(tag));
    }
    
    // Path analysis for additional context
    if (path.includes('/blog')) suggestions.add('blog');
    if (path.includes('/tutorial')) suggestions.add('tutorial');
    if (path.includes('/guide')) suggestions.add('guide');
    if (path.includes('/docs') || path.includes('/documentation')) suggestions.add('documentation');
    if (path.includes('/api')) suggestions.add('api');
    if (path.includes('/reference')) suggestions.add('reference');
    if (path.includes('/example')) suggestions.add('example');
    if (path.includes('/demo')) suggestions.add('demo');
    if (path.includes('/video')) suggestions.add('video');
    if (path.includes('/course')) suggestions.add('course');
    if (path.includes('/tool')) suggestions.add('tools');
    
    // Combine title and description for keyword analysis
    const content = `${title} ${description}`.toLowerCase();
    
    // Keyword-based suggestions
    Object.keys(KEYWORD_TAG_MAP).forEach(keyword => {
      if (content.includes(keyword)) {
        KEYWORD_TAG_MAP[keyword].forEach(tag => suggestions.add(tag));
      }
    });
    
    // File extension detection
    if (url.match(/\.(pdf)$/i)) suggestions.add('pdf');
    if (url.match(/\.(mp4|mov|avi|mkv)$/i)) suggestions.add('video');
    if (url.match(/\.(mp3|wav|flac)$/i)) suggestions.add('audio');
    if (url.match(/\.(zip|tar|gz|rar)$/i)) suggestions.add('download');
    
    // Content type suggestions from title/description
    if (content.match(/\b(how to|tutorial|guide|walkthrough)\b/)) {
      suggestions.add('tutorial');
    }
    if (content.match(/\b(tips|tricks|best practices)\b/)) {
      suggestions.add('tips');
    }
    if (content.match(/\b(breaking|news|announcement)\b/)) {
      suggestions.add('news');
    }
    if (content.match(/\b(free|open source|libre)\b/)) {
      suggestions.add('free');
    }
    if (content.match(/\b(awesome|amazing|incredible|must)\b/)) {
      suggestions.add('interesting');
    }
    
  } catch (error) {
    console.warn('Error parsing URL for tag suggestions:', error);
  }
  
  // Convert to array and sort by relevance (more specific first)
  const tagArray = Array.from(suggestions);
  
  // Sort by length (shorter, more general tags last) and alphabetically
  return tagArray
    .sort((a, b) => {
      if (a.length !== b.length) return a.length - b.length;
      return a.localeCompare(b);
    })
    .slice(0, 8); // Limit to 8 suggestions
}

/**
 * Gets related tags based on existing tags in the dataset
 * @param {string[]} currentTags - Currently selected tags
 * @param {Array} allLinks - All links to analyze for tag relationships
 * @returns {string[]} Array of related tag suggestions
 */
export function getRelatedTags(currentTags, allLinks = []) {
  if (!currentTags.length || !allLinks.length) return [];
  
  const tagCoOccurrence = new Map();
  
  // Build co-occurrence map
  allLinks.forEach(link => {
    if (!link.tags || link.tags.length < 2) return;
    
    link.tags.forEach(tag => {
      if (currentTags.includes(tag)) {
        // This link contains one of our current tags
        link.tags.forEach(otherTag => {
          if (otherTag !== tag && !currentTags.includes(otherTag)) {
            const count = tagCoOccurrence.get(otherTag) || 0;
            tagCoOccurrence.set(otherTag, count + 1);
          }
        });
      }
    });
  });
  
  // Sort by co-occurrence frequency and return top suggestions
  return Array.from(tagCoOccurrence.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([tag]) => tag);
}

/**
 * Validates and cleans a tag
 * @param {string} tag - Tag to validate
 * @returns {string|null} Cleaned tag or null if invalid
 */
export function validateTag(tag) {
  if (!tag || typeof tag !== 'string') return null;
  
  // Clean the tag
  const cleaned = tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-_]/g, '-') // Replace invalid chars with dash
    .replace(/-+/g, '-') // Collapse multiple dashes
    .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
  
  // Validation rules
  if (cleaned.length < 2) return null;
  if (cleaned.length > 30) return null;
  
  return cleaned;
}

/**
 * Suggests tag completions based on partial input
 * @param {string} partial - Partial tag input
 * @param {string[]} existingTags - Existing tags in the system
 * @returns {string[]} Array of completion suggestions
 */
export function suggestTagCompletions(partial, existingTags = []) {
  if (!partial || partial.length < 1) return [];
  
  const lower = partial.toLowerCase();
  const suggestions = new Set();
  
  // Match from existing tags first
  existingTags
    .filter(tag => tag.toLowerCase().startsWith(lower))
    .forEach(tag => suggestions.add(tag));
  
  // Match from common tags
  COMMON_TAGS
    .filter(tag => tag.toLowerCase().startsWith(lower))
    .forEach(tag => suggestions.add(tag));
  
  return Array.from(suggestions)
    .sort((a, b) => {
      // Prioritize exact matches, then shorter matches
      if (a.toLowerCase() === lower) return -1;
      if (b.toLowerCase() === lower) return 1;
      return a.length - b.length || a.localeCompare(b);
    })
    .slice(0, 10);
}