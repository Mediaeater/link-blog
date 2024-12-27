import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';

const LinkPreview = ({ url }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        if (data.status === 'success') {
          setPreview(data.data);
        } else {
          throw new Error('Failed to fetch preview');
        }
      } catch (error) {
        console.error('Error fetching preview:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      fetchPreview();
    }
  }, [url]);

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading preview...</div>;
  }

  if (error || !preview) {
    return <div className="text-gray-500 text-sm">Preview unavailable</div>;
  }

  return (
    <Card className="mt-2 overflow-hidden">
      <CardContent className="p-2">
        <div className="flex gap-4">
          {preview.image && (
            <img 
              src={preview.image.url} 
              alt={preview.title || 'Link preview'} 
              className="w-24 h-24 object-cover"
            />
          )}
          <div>
            <h3 className="text-sm font-medium">{preview.title}</h3>
            {preview.description && (
              <p className="text-xs text-gray-500 mt-1">{preview.description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LinkPreview;
