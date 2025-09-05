import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Tag, Plus, X, Pin, Edit, Trash2, Rss } from 'lucide-react';

const ADMIN_USER = 'Mediaeater';
const MAX_TITLE_LENGTH = 120;
const LINKS_PER_PAGE = 10;

const LinkBlog = () => {
  const [links, setLinks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [newLink, setNewLink] = useState({ url: '', source: '', tags: [], isPinned: false });
  const [currentTag, setCurrentTag] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const paginatedLinks = links.slice(0, currentPage * LINKS_PER_PAGE);

  const loadLinks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const basePath = import.meta.env.BASE_URL || '/';
      const url = `${basePath}data/links.json`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

      const data = await response.json();
      if (!data || !Array.isArray(data.links)) throw new Error('Invalid data format');

      const sortedLinks = [...data.links].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
        return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
      });

      setLinks(sortedLinks);
      setLastUpdated(data.lastUpdated);
    } catch (error) {
      console.error('Error loading links:', error);
      setError(error.message);
      setLinks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLinks();
    const urlParams = new URLSearchParams(window.location.search);
    setIsAdmin(urlParams.get('admin') === ADMIN_USER);
  }, [loadLinks]);

  const saveToFile = async (updatedLinks) => {
    try {
      const sortedLinks = [...updatedLinks].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
        return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
      });

      const data = {
        lastUpdated: new Date().toISOString(),
        links: sortedLinks,
      };

      // Save to localStorage
      localStorage.setItem('linkBlogData', JSON.stringify(data));
      console.log('Data saved. Run: ./scripts/sync-changes.js "$(cat public/data/links.json)"');

      // Update UI
      setLinks(sortedLinks);
      setLastUpdated(data.lastUpdated);
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const loadMoreLinks = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 font-mono">
      <h1 className="text-3xl font-bold text-center mb-4">Mediaeater Digest</h1>
      
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <div className="text-sm text-gray-600">
              {new Date(lastUpdated).toLocaleDateString()}
            </div>
          )}
          <a 
            href="/link-blog/feed.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Rss size={16} />
            RSS
          </a>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <div className="space-y-4">
          {paginatedLinks.map(link => (
            <Card key={link.id} className="rounded-none border-gray-200">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-grow">
                    <div className="link-title flex items-center gap-2">
                      {link.isPinned && <Pin size={16} className="text-blue-500" />}
                      <a 
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 no-underline hover:underline"
                      >
                        {link.source}
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {currentPage * LINKS_PER_PAGE < links.length && (
            <Button onClick={loadMoreLinks} className="w-full mt-4">
              Load More
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default LinkBlog;
