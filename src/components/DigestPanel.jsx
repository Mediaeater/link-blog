import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.DEV ? 'http://127.0.0.1:3001' : '';

export default function DigestPanel() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/digest/status`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setError(null);
      }
    } catch (err) {
      setError('Could not fetch digest status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleGenerate = async (markAsDigested = false) => {
    setGenerating(true);
    setCopied(false);
    try {
      const response = await fetch(`${API_BASE}/api/digest/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAsDigested })
      });
      const data = await response.json();
      if (data.success) {
        setGeneratedHtml(data.html);
        setShowModal(true);
        if (markAsDigested) {
          fetchStatus();
        }
      } else {
        setError(data.error || 'Failed to generate digest');
      }
    } catch (err) {
      setError('Failed to generate digest');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedHtml);
      setCopied(true);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = generatedHtml;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
    }
  };

  const handleMarkAsDigested = async () => {
    await handleGenerate(true);
    setShowModal(false);
  };

  if (loading) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleGenerate(false)}
          disabled={generating || !status || status.undigestedCount === 0}
          className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 ${
            status?.ready
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {generating ? 'Generating...' : 'WP Digest'}
          {status && (
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              status.ready ? 'bg-amber-600' : 'bg-gray-400 dark:bg-gray-600'
            }`}>
              {status.undigestedCount}
            </span>
          )}
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                WordPress Digest ({status?.undigestedCount} links)
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto">
              <label className="block text-sm font-medium mb-2">HTML Output:</label>
              <textarea
                readOnly
                value={generatedHtml}
                className="w-full h-48 p-2 font-mono text-sm border rounded dark:bg-gray-900 dark:border-gray-600"
              />

              <label className="block text-sm font-medium mt-4 mb-2">Preview:</label>
              <div
                className="p-3 border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-600 prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: generatedHtml }}
              />
            </div>

            <div className="p-4 border-t dark:border-gray-700 flex gap-2 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {copied ? '✓ Copied!' : 'Copy HTML'}
              </button>
              {copied && (
                <button
                  onClick={handleMarkAsDigested}
                  className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Mark as Digested
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2">✕</button>
        </div>
      )}
    </>
  );
}
