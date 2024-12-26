import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Tag, Plus, X } from 'lucide-react';

const ADMIN_USER = 'Mediaeater';
const MAX_TITLE_LENGTH = 120;

const LinkBlog = () => {
  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState({ url: '', source: '', tags: [] });
  const [currentTag, setCurrentTag] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [allTags, setAllTags] = useState([]);

  useEffect(() => {
    fetchLinks();
    const urlParams = new URLSearchParams(window.location.search);
    setIsAdmin(urlParams.get('admin') === ADMIN_USER);
  }, []);

  const fetchLinks = async () => {
    try {
      // First try the deployed path
      let response = await fetch('/link-blog/data/links.json');
      
      // If that fails, try the development path
      if (!response.ok) {
        response = await fetch('/data/links.json');
      }

      const data = await response.json();
      if (data && data.links) {
        setLinks(data.links);
        setLastUpdated(data.lastUpdated || new Date().toISOString());
        
        // Extract all unique tags
        const tags = new Set();
        data.links.forEach(link => {
          link.tags.forEach(tag => tags.add(tag));
        });
        setAllTags([...tags]);
      } else {
        // If no valid data in JSON, try localStorage as fallback
        const localLinks = JSON.parse(localStorage.getItem('links') || '[]');
        setLinks(localLinks);
      }
    } catch (error) {
      console.error('Error fetching links:', error);
      // Fallback to localStorage if fetch fails
      const localLinks = JSON.parse(localStorage.getItem('links') || '[]');
      setLinks(localLinks);
    }
  };

  const addLink = () => {
    if (newLink.url && newLink.source && isAdmin) {
      if (newLink.source.length > MAX_TITLE_LENGTH) {
        alert(`Title must be less than ${MAX_TITLE_LENGTH} characters`);
        return;
      }
      const updatedLinks = [...links, { ...newLink, id: Date.now() }];
      setLinks(updatedLinks);
      setNewLink({ url: '', source: '', tags: [] });
    }
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
      tags: newLink.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const filteredLinks = selectedTag 
    ? links.filter(link => link.tags.includes(selectedTag))
    : links;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const extractDomain = (url) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 font-mono">
      {lastUpdated && (
        <div className="mb-6 text-sm text-gray-600">
          Last Updated: {formatDate(lastUpdated)}
        </div>
      )}

      {isAdmin && (
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-4">Add New Link</h1>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <Input
                    type="url"
                    placeholder="URL"
                    value={newLink.url}
                    onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                    className="mb-2"
                  />
                  <Input
                    type="text"
                    placeholder="Source Name"
                    maxLength={MAX_TITLE_LENGTH}
                    value={newLink.source}
                    onChange={(e) => setNewLink({ ...newLink, source: e.target.value })}
                    className="mb-2"
                  />
                  <div className="text-sm text-gray-500 mb-2">
                    {newLink.source.length}/{MAX_TITLE_LENGTH} characters
                  </div>
                  <div className="flex gap-2 mb-2">
                    <Input
                      type="text"
                      placeholder="Add tag"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button 
                      onClick={addTag}
                      disabled={newLink.tags.length >= 5}
                      className="flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Tag
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {newLink.tags.map(tag => (
                      <span
                        key={tag}
                        className="bg-gray-100 text-gray-800 px-2 py-1 rounded-none flex items-center gap-1"
                      >
                        <Tag size={14} />
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="hover:text-gray-600"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <Button onClick={addLink} className="w-full rounded-none">Add Link</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Links</h2>
          {allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="border rounded-none p-2 font-mono"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}
        </div>
        <div className="space-y-4">
          {filteredLinks.map(link => (
            <Card key={link.id} className="rounded-none border-gray-200">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="link-title">
                      <a 
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 no-underline hover:underline"
                      >
                        {link.source} [{extractDomain(link.url)}]
                      </a>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {link.tags.map(tag => (
                        <span
                          key={tag}
                          className="bg-gray-100 text-gray-800 px-2 py-1 rounded-none inline-flex items-center gap-1 cursor-pointer"
                          onClick={() => setSelectedTag(tag)}
                        >
                          <Tag size={14} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LinkBlog;