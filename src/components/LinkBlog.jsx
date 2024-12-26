import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Tag, Plus, X, Pin, Edit, Trash2 } from 'lucide-react';
import LinkPreview from './LinkPreview';

const ADMIN_USER = 'Mediaeater';
const MAX_TITLE_LENGTH = 120;

const LinkBlog = () => {
  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState({ url: '', source: '', tags: [], isPinned: false });
  const [currentTag, setCurrentTag] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    loadLinks();
    const urlParams = new URLSearchParams(window.location.search);
    setIsAdmin(urlParams.get('admin') === ADMIN_USER);
  }, []);

  const loadLinks = async () => {
    try {
      const url = window.location.hostname === 'localhost' 
        ? '/data/links.json'
        : '/link-blog/data/links.json';
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      const text = await response.text();
      const data = JSON.parse(text);

      if (!data || !Array.isArray(data.links)) throw new Error('Invalid data format');

      const sortedLinks = [...data.links].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
        return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
      });

      setLinks(sortedLinks);
      setLastUpdated(data.lastUpdated);
      setFetchError(null);
    } catch (error) {
      console.error('Error loading links:', error);
      setFetchError(error.message);
      setLinks([]);
    }
  };

  const saveToFile = async (updatedLinks) => {
    try {
      const sortedLinks = [...updatedLinks].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
        return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
      });

      const data = {
        lastUpdated: new Date().toISOString(),
        links: sortedLinks
      };

      setLinks(sortedLinks);
      setLastUpdated(data.lastUpdated);
      
      // Log data for manual update
      console.log('Updated data to save:', JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const addLink = () => {
    if (newLink.url && newLink.source && isAdmin) {
      if (newLink.source.length > MAX_TITLE_LENGTH) {
        alert(`Title must be less than ${MAX_TITLE_LENGTH} characters`);
        return;
      }
      const updatedLinks = [...links, { 
        ...newLink, 
        id: Date.now(),
        timestamp: new Date().toISOString()
      }];
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
      tags: newLink.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
      <h1 className="text-3xl font-bold text-center mb-4">Mediaeater Digest</h1>
      
      <div className="flex justify-between items-center mb-8">
        {lastUpdated && (
          <div className="text-sm text-gray-600">
            {formatDate(lastUpdated)}
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">
            {editingLink ? 'Edit Link' : 'Add New Link'}
          </h2>
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
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={newLink.isPinned}
                      onChange={(e) => setNewLink({ ...newLink, isPinned: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm">Pin to top</span>
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
                  <Button 
                    onClick={editingLink ? updateLink : addLink} 
                    className="w-full rounded-none"
                  >
                    {editingLink ? 'Update Link' : 'Add Link'}
                  </Button>
                  {editingLink && (
                    <Button 
                      onClick={() => {
                        setEditingLink(null);
                        setNewLink({ url: '', source: '', tags: [], isPinned: false });
                      }}
                      className="w-full mt-2 rounded-none bg-gray-200 text-gray-800 hover:bg-gray-300"
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        {links.map(link => (
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
                  <LinkPreview url={link.url} />
                </div>
                {isAdmin && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => togglePin(link.id)}
                      className="p-1 hover:text-blue-600"
                      title={link.isPinned ? "Unpin" : "Pin"}
                    >
                      <Pin size={16} className={link.isPinned ? "text-blue-500" : ""} />
                    </button>
                    <button
                      onClick={() => editLink(link)}
                      className="p-1 hover:text-blue-600"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => deleteLink(link.id)}
                      className="p-1 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LinkBlog;