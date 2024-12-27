import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Tag, Plus, X, Pin, Edit, Trash2, Rss } from 'lucide-react';

const ADMIN_USER = 'Mediaeater';
const MAX_TITLE_LENGTH = 120;

const LinkBlog = () => {
  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState({ url: '', source: '', tags: [], isPinned: false });
  const [currentTag, setCurrentTag] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load links from localStorage or JSON file
  const loadLinks = useCallback(async () => {
    try {
      setIsLoading(true);
      const localData = localStorage.getItem('linkBlogData');
      if (localData) {
        const parsedData = JSON.parse(localData);
        console.log("Loading from localStorage:", parsedData);
        setLinks(parsedData.links || []);
        setLastUpdated(parsedData.lastUpdated || null);
        return;
      }

      const url = window.location.hostname === 'localhost' 
        ? '/data/links.json'
        : '/link-blog/data/links.json';

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch links.json');

      const data = await response.json();
      console.log("Loaded from JSON file:", data);
      setLinks(data.links || []);
      setLastUpdated(data.lastUpdated || null);
    } catch (error) {
      console.error('Error loading links:', error);
      setError(error.message);
      setLinks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save links to localStorage
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

      console.log("Saving data to localStorage:", data);
      localStorage.setItem('linkBlogData', JSON.stringify(data));

      setLinks(sortedLinks);
      setLastUpdated(data.lastUpdated);
    } catch (error) {
      console.error('Error saving links:', error);
      alert('Failed to save changes. Check console for details.');
    }
  };

  useEffect(() => {
    loadLinks();
    const urlParams = new URLSearchParams(window.location.search);
    setIsAdmin(urlParams.get('admin') === ADMIN_USER);
  }, [loadLinks]);

  const addLink = () => {
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
        },
      ];
      saveToFile(updatedLinks);
      setNewLink({ url: '', source: '', tags: [], isPinned: false });
    }
  };

  const deleteLink = (id) => {
    if (!isAdmin) return;
    if (window.confirm('Are you sure you want to delete this link?')) {
      const updatedLinks = links.filter(link => link.id !== id);
      saveToFile(updatedLinks);
    }
  };

  const editLink = (link) => {
    if (!isAdmin) return;
    setEditingLink(link);
    setNewLink({ ...link });
  };

  const updateLink = () => {
    if (!editingLink || !isAdmin) return;
    const updatedLinks = links.map(link => 
      link.id === editingLink.id ? { ...newLink, timestamp: new Date().toISOString() } : link
    );
    saveToFile(updatedLinks);
    setEditingLink(null);
    setNewLink({ url: '', source: '', tags: [], isPinned: false });
  };

  const togglePin = (id) => {
    if (!isAdmin) return;
    const updatedLinks = links.map(link => {
      if (link.id === id) {
        return { ...link, isPinned: !link.isPinned };
      }
      return link;
    });
    saveToFile(updatedLinks);
  };

  const addTag = () => {
    if (currentTag && newLink.tags.length < 5 && !newLink.tags.includes(currentTag)) {
      setNewLink({ ...newLink, tags: [...newLink.tags, currentTag] });
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setNewLink({
      ...newLink,
      tags: newLink.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 font-mono">
      <h1 className="text-3xl font-bold text-center mb-4">Mediaeater Digest</h1>
      
      {error && <div className="text-red-500 text-center">{error}</div>}

      {isLoading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <div>
          {links.map(link => (
            <div key={link.id} className="my-4">
              <p>{link.source}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LinkBlog;
