import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.DEV ? 'http://127.0.0.1:3001' : '';

export default function ArchivePanel({ isOpen, onClose }) {
  const [digests, setDigests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDigest, setSelectedDigest] = useState(null);
  const [digestHtml, setDigestHtml] = useState('');
  const [loadingDigest, setLoadingDigest] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDigests();
    }
  }, [isOpen]);

  const fetchDigests = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/digests`);
      if (response.ok) {
        const data = await response.json();
        setDigests(data.digests);
      }
    } catch (err) {
      console.error('Failed to fetch digests:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDigest = async (digest) => {
    setLoadingDigest(true);
    setSelectedDigest(digest);
    try {
      const response = await fetch(`${API_BASE}/api/digest/${digest.id}`);
      if (response.ok) {
        const data = await response.json();
        setDigestHtml(data.html);
      }
    } catch (err) {
      console.error('Failed to load digest:', err);
    } finally {
      setLoadingDigest(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {selectedDigest ? `Digest #${selectedDigest.id}` : 'Digest Archive'}
          </h2>
          <div className="flex gap-2">
            {selectedDigest && (
              <button
                onClick={() => {
                  setSelectedDigest(null);
                  setDigestHtml('');
                }}
                className="px-3 py-1 text-sm rounded border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Back
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2"
            >
              X
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : selectedDigest ? (
            loadingDigest ? (
              <div className="text-center py-8 text-gray-500">Loading digest...</div>
            ) : (
              <div
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: digestHtml }}
              />
            )
          ) : digests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No digests yet</div>
          ) : (
            <div className="space-y-2">
              {digests.map((digest) => (
                <button
                  key={digest.id}
                  onClick={() => loadDigest(digest)}
                  className="w-full text-left p-4 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">Digest #{digest.id}</span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2">
                        {formatDate(digest.timestamp)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {digest.count} links
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
