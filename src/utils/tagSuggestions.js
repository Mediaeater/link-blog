// Common tech and topic tags for link categorization
export const COMMON_TAGS = [
  // Technology
  'javascript', 'react', 'vue', 'angular', 'nodejs', 'python', 'go', 'rust',
  'typescript', 'css', 'html', 'sass', 'tailwind', 'bootstrap',
  
  // Web Development  
  'frontend', 'backend', 'fullstack', 'api', 'rest', 'graphql', 'database',
  'mongodb', 'postgresql', 'mysql', 'redis', 'docker', 'kubernetes',
  
  // Topics & Concepts
  'tutorial', 'guide', 'documentation', 'best-practices', 'performance',
  'security', 'testing', 'debugging', 'optimization', 'accessibility',
  
  // Tools & Services
  'vscode', 'git', 'github', 'gitlab', 'aws', 'azure', 'gcp', 'vercel',
  'netlify', 'figma', 'design', 'ux', 'ui',
  
  // Content Types
  'article', 'blog', 'news', 'video', 'podcast', 'course', 'book',
  'tool', 'library', 'framework', 'resource', 'inspiration',
  
  // General Topics
  'productivity', 'career', 'remote-work', 'startup', 'business',
  'marketing', 'ai', 'machine-learning', 'blockchain', 'crypto',
  'mobile', 'ios', 'android', 'gaming', 'devops', 'ci-cd'
];

export const suggestTagsFromUrl = (url, title = '', description = '') => {
  const text = `${url} ${title} ${description}`.toLowerCase();
  const suggestions = [];
  
  // Check for common tags in the URL, title, or description
  COMMON_TAGS.forEach(tag => {
    if (text.includes(tag.replace('-', '')) || text.includes(tag)) {
      suggestions.push(tag);
    }
  });
  
  // Domain-based suggestions
  if (url.includes('github.com')) suggestions.push('github', 'code');
  if (url.includes('medium.com')) suggestions.push('article', 'blog');
  if (url.includes('youtube.com')) suggestions.push('video');
  if (url.includes('stackoverflow.com')) suggestions.push('question', 'help');
  if (url.includes('twitter.com')) suggestions.push('social', 'twitter');
  if (url.includes('linkedin.com')) suggestions.push('professional', 'career');
  
  return [...new Set(suggestions)].slice(0, 5); // Remove duplicates and limit to 5
};

export const getPopularTags = (links) => {
  const tagCount = {};
  
  links.forEach(link => {
    if (link.tags) {
      link.tags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    }
  });
  
  return Object.entries(tagCount)
    .sort(([,a], [,b]) => b - a)
    .map(([tag]) => tag);
};