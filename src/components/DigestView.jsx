import { useState } from 'react';
import { ExternalLink } from 'lucide-react';

function getTopTags(digestLinks, max = 5) {
  const counts = {};
  for (const link of digestLinks) {
    if (link.tags) {
      for (const tag of link.tags) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([tag]) => tag);
}

export default function DigestView({ digests, links, onTagClick }) {
  // Latest digest expanded by default, older ones collapsed
  const [expandedId, setExpandedId] = useState(null);

  // Build link lookup
  const linkMap = new Map();
  for (const link of links) {
    linkMap.set(link.id, link);
  }

  // Show digests newest-first, skip digest 0 (initial bulk import)
  const visibleDigests = digests
    .filter(d => d.id !== 0)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (visibleDigests.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-neutral-500">No digests yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {visibleDigests.map(digest => {
        const isExpanded = expandedId === digest.id;
        const digestLinks = digest.linkIds
          .map(id => linkMap.get(id))
          .filter(Boolean);

        return (
          <div key={digest.id} className="border-b border-neutral-200 pb-6">
            <button
              onClick={() => setExpandedId(isExpanded ? null : digest.id)}
              className="w-full text-left group"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-medium text-neutral-900 group-hover:text-primary-600 transition-colors">
                  {digest.title || `Digest #${digest.id}`}
                </h2>
                <span className="text-xs text-neutral-400 flex-shrink-0">
                  {digestLinks.length} links
                </span>
              </div>
            </button>

            {!isExpanded && (
              digest.summary ? (
                <p className="mt-2 text-sm text-neutral-500">
                  {digest.summary}
                </p>
              ) : digestLinks.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {getTopTags(digestLinks).map(tag => (
                    <span key={tag} className="text-xs text-neutral-400">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null
            )}

            {digest.writeup && (
              isExpanded ? (
                <div className="mt-3 text-sm text-neutral-600 italic leading-relaxed max-w-[65ch] space-y-4">
                  {digest.writeup.split('\n\n').map((paragraph, i) => (
                    <p key={i}>
                      {paragraph.split('\n').map((line, j, arr) => (
                        <span key={j}>
                          {line}
                          {j < arr.length - 1 && <br />}
                        </span>
                      ))}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-neutral-500 line-clamp-2">
                  {digest.writeup}
                </p>
              )
            )}

            {isExpanded && (
              <div className="mt-4 flex flex-col gap-4">
                {digestLinks.map(link => (
                  <article key={link.id} className="link-card group">
                    <div className="flex gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-neutral-900 truncate">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary-600 transition-colors"
                          >
                            {link.source}
                          </a>
                        </h3>
                        <p className="text-sm text-neutral-500 truncate">
                          {(() => {
                            try {
                              return new URL(link.url).hostname.replace('www.', '');
                            } catch {
                              return link.url;
                            }
                          })()}
                        </p>
                        {link.pullQuote && (
                          <div className="mt-2 text-sm text-neutral-600 italic space-y-2">
                            {link.pullQuote.split('\n\n').map((paragraph, i) => (
                              <p key={i}>
                                {paragraph.split('\n').map((line, j, arr) => (
                                  <span key={j}>
                                    {line}
                                    {j < arr.length - 1 && <br />}
                                  </span>
                                ))}
                              </p>
                            ))}
                          </div>
                        )}
                        {link.tags && link.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {link.tags.map(tag => (
                              <button
                                key={tag}
                                onClick={() => onTagClick?.(tag)}
                                className="tag"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex items-center gap-4 text-xs text-neutral-400">
                          <span>{new Date(link.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ghost p-2"
                          title="Open link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
