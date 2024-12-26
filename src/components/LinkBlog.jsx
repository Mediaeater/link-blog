import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Tag, Plus, X, Download } from 'lucide-react';

const ADMIN_USER = 'Mediaeater';

const LinkBlog = () => {
  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState({ url: '', source: '', tags: [] });
  const [currentTag, setCurrentTag] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchLinks();
    const urlParams = new URLSearchParams(window.location.search);
    setIsAdmin(urlParams.get('admin') === ADMIN_USER);
  }, []);

  const fetchLinks = async () => {
    try {
      const response = await fetch('/link-blog/data/links.json');
      const data = await response.json();
      setLinks(data.links);
    } catch (error) {
      console.error('Error fetching links:', error);
      // If fetch fails, try loading from localStorage
      const savedLinks = JSON.parse(localStorage.getItem('links') || '[]');
      setLinks(savedLinks);
    }
  };

  const addLink = () => {
    if (newLink.url && newLink.source && isAdmin) {
      const updatedLinks = [...links, { ...newLink, id: Date.now().toString() }];
      setLinks(updatedLinks);
      localStorage.setItem('links', JSON.stringify(updatedLinks));
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

  const downloadLinksJson = () => {
    const data = {
      links: links
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'links.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {isAdmin && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Add New Link</h1>
            <Button onClick={downloadLinksJson} className="flex items-center gap-2">
              <Download size={16} />
              Export Links
            </Button>
          </div>
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
                    value={newLink.source}
                    onChange={(e) => setNewLink({ ...newLink, source: e.target.value })}
                    className="mb-2"
                  />
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
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1"
                      >
                        <Tag size={14} />
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="hover:text-blue-600"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <Button onClick={addLink} className="w-full">Add Link</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-4">Links</h2>
        <div className="space-y-4">
          {links.map(link => (
            <Card key={link.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <a 
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-blue-600 hover:text-blue-800"
                    >
                      {link.source}
                    </a>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {link.tags.map(tag => (
                        <span
                          key={tag}
                          className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1"
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