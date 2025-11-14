const STORAGE_KEY = 'link-blog-data';
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

export const saveLinks = (links) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
    return true;
  } catch (error) {
    console.error('Error saving links:', error);
    return false;
  }
};

export const loadLinks = () => {
  try {
    const links = localStorage.getItem(STORAGE_KEY);
    return links ? JSON.parse(links) : [];
  } catch (error) {
    console.error('Error loading links:', error);
    return [];
  }
};

/**
 * Load archived years metadata
 */
export const loadArchiveMetadata = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/archives`);
    if (!response.ok) {
      throw new Error('Failed to load archive metadata');
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading archive metadata:', error);
    return [];
  }
};

/**
 * Load links from a specific archived year
 */
export const loadArchiveYear = async (year) => {
  try {
    const response = await fetch(`${API_BASE}/api/archive/${year}`);
    if (!response.ok) {
      throw new Error(`Failed to load archive for ${year}`);
    }
    const data = await response.json();
    return data.links || [];
  } catch (error) {
    console.error(`Error loading archive for ${year}:`, error);
    return [];
  }
};

/**
 * Load all links including archives
 */
export const loadAllLinks = async () => {
  try {
    // Load current links from JSON
    const currentResponse = await fetch('/data/links.json?' + Date.now());
    const currentData = await currentResponse.json();
    const allLinks = [...currentData.links];

    // Load archive metadata
    const archives = await loadArchiveMetadata();

    // Load each archived year
    for (const archive of archives) {
      const archiveLinks = await loadArchiveYear(archive.year);
      allLinks.push(...archiveLinks);
    }

    return allLinks;
  } catch (error) {
    console.error('Error loading all links:', error);
    return [];
  }
};