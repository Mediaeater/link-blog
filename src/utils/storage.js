const STORAGE_KEY = 'link-blog-data';

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