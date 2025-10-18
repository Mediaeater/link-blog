const fs = require('fs').promises;
const path = require('path');
const { getKeyPair } = require('./crypto.cjs');

/**
 * Core ActivityPub service
 * Handles actor profile, followers, and activity management
 */

const DOMAIN = 'newsfeeds.net';
const ACTOR_USERNAME = 'mediaeater';
const ACTOR_NAME = 'mediaeater - dispute the text';
const ACTOR_SUMMARY = 'A curated collection of interesting links and resources';

const FOLLOWERS_PATH = path.join(__dirname, '..', 'data', 'activitypub', 'followers.json');
const ACTIVITIES_PATH = path.join(__dirname, '..', 'data', 'activitypub', 'activities.json');

/**
 * Get the actor object (profile)
 * @returns {Promise<Object>} ActivityPub Actor object
 */
async function getActor() {
  const { publicKey } = await getKeyPair();

  return {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://w3id.org/security/v1'
    ],
    id: `https://${DOMAIN}/actor/${ACTOR_USERNAME}`,
    type: 'Person',
    preferredUsername: ACTOR_USERNAME,
    name: ACTOR_NAME,
    summary: ACTOR_SUMMARY,
    inbox: `https://${DOMAIN}/actor/${ACTOR_USERNAME}/inbox`,
    outbox: `https://${DOMAIN}/actor/${ACTOR_USERNAME}/outbox`,
    followers: `https://${DOMAIN}/actor/${ACTOR_USERNAME}/followers`,
    following: `https://${DOMAIN}/actor/${ACTOR_USERNAME}/following`,
    publicKey: {
      id: `https://${DOMAIN}/actor/${ACTOR_USERNAME}#main-key`,
      owner: `https://${DOMAIN}/actor/${ACTOR_USERNAME}`,
      publicKeyPem: publicKey
    },
    icon: {
      type: 'Image',
      mediaType: 'image/x-icon',
      url: `https://${DOMAIN}/favicon.ico`
    },
    endpoints: {
      sharedInbox: `https://${DOMAIN}/inbox`
    }
  };
}

/**
 * Get WebFinger response
 * @param {string} resource - The requested resource (e.g., acct:mediaeater@newsfeeds.net)
 * @returns {Object|null} WebFinger JRD object or null if not found
 */
function getWebFinger(resource) {
  const expectedResource = `acct:${ACTOR_USERNAME}@${DOMAIN}`;

  if (resource !== expectedResource) {
    return null;
  }

  return {
    subject: expectedResource,
    aliases: [
      `https://${DOMAIN}/actor/${ACTOR_USERNAME}`
    ],
    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: `https://${DOMAIN}/actor/${ACTOR_USERNAME}`
      },
      {
        rel: 'http://webfinger.net/rel/profile-page',
        type: 'text/html',
        href: `https://${DOMAIN}`
      }
    ]
  };
}

/**
 * Convert a link to an ActivityPub Note object
 * @param {Object} link - Link object from links.json
 * @returns {Object} ActivityPub Note
 */
function linkToNote(link) {
  // Build content HTML
  let content = `<p><a href="${escapeHtml(link.url)}">${escapeHtml(link.source || link.url)}</a></p>`;

  if (link.pullQuote) {
    content += `<blockquote>${escapeHtml(link.pullQuote)}</blockquote>`;
  }

  // Build tags
  const tags = (link.tags || []).map(tag => ({
    type: 'Hashtag',
    name: `#${tag}`,
    href: `https://${DOMAIN}/?tag=${encodeURIComponent(tag)}`
  }));

  return {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `https://${DOMAIN}/note/${link.id}`,
    type: 'Note',
    published: link.timestamp,
    attributedTo: `https://${DOMAIN}/actor/${ACTOR_USERNAME}`,
    content,
    url: `https://${DOMAIN}/note/${link.id}`,
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: [`https://${DOMAIN}/actor/${ACTOR_USERNAME}/followers`],
    tag: tags,
    attachment: link.url ? [{
      type: 'Link',
      href: link.url,
      name: link.source || link.url
    }] : []
  };
}

/**
 * Wrap a Note in a Create activity
 * @param {Object} note - ActivityPub Note object
 * @returns {Object} ActivityPub Create activity
 */
function wrapInCreateActivity(note) {
  return {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `https://${DOMAIN}/activity/${note.id.split('/').pop()}`,
    type: 'Create',
    actor: `https://${DOMAIN}/actor/${ACTOR_USERNAME}`,
    published: note.published,
    to: note.to,
    cc: note.cc,
    object: note
  };
}

/**
 * Get outbox (collection of published activities)
 * @param {Array} links - Array of link objects
 * @param {number} page - Page number (optional)
 * @param {number} perPage - Items per page
 * @returns {Object} ActivityPub OrderedCollection or OrderedCollectionPage
 */
function getOutbox(links, page = null, perPage = 20) {
  const sortedLinks = [...links].sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  const baseUrl = `https://${DOMAIN}/actor/${ACTOR_USERNAME}/outbox`;

  // Return collection summary
  if (page === null) {
    return {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: baseUrl,
      type: 'OrderedCollection',
      totalItems: sortedLinks.length,
      first: `${baseUrl}?page=1`,
      last: `${baseUrl}?page=${Math.ceil(sortedLinks.length / perPage)}`
    };
  }

  // Return page
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const pageLinks = sortedLinks.slice(startIndex, endIndex);

  const activities = pageLinks.map(link => {
    const note = linkToNote(link);
    return wrapInCreateActivity(note);
  });

  return {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${baseUrl}?page=${page}`,
    type: 'OrderedCollectionPage',
    partOf: baseUrl,
    orderedItems: activities,
    prev: page > 1 ? `${baseUrl}?page=${page - 1}` : undefined,
    next: endIndex < sortedLinks.length ? `${baseUrl}?page=${page + 1}` : undefined
  };
}

/**
 * Load followers from disk
 * @returns {Promise<Array>} Array of follower objects
 */
async function loadFollowers() {
  try {
    const data = await fs.readFile(FOLLOWERS_PATH, 'utf8');
    const json = JSON.parse(data);
    return json.followers || [];
  } catch (error) {
    // File doesn't exist yet
    return [];
  }
}

/**
 * Save followers to disk
 * @param {Array} followers - Array of follower objects
 */
async function saveFollowers(followers) {
  const dir = path.dirname(FOLLOWERS_PATH);
  await fs.mkdir(dir, { recursive: true });

  const data = {
    followers,
    lastUpdated: new Date().toISOString()
  };

  await fs.writeFile(FOLLOWERS_PATH, JSON.stringify(data, null, 2));
}

/**
 * Add a follower
 * @param {Object} actor - Remote actor object
 * @returns {Promise<void>}
 */
async function addFollower(actor) {
  const followers = await loadFollowers();

  // Don't add duplicates
  if (followers.some(f => f.id === actor.id)) {
    return;
  }

  followers.push({
    id: actor.id,
    inbox: actor.inbox,
    sharedInbox: actor.endpoints?.sharedInbox,
    followedAt: new Date().toISOString(),
    name: actor.name,
    preferredUsername: actor.preferredUsername
  });

  await saveFollowers(followers);
  console.log(`Added follower: ${actor.preferredUsername} (${actor.id})`);
}

/**
 * Remove a follower
 * @param {string} actorId - Actor ID to remove
 * @returns {Promise<void>}
 */
async function removeFollower(actorId) {
  const followers = await loadFollowers();
  const filtered = followers.filter(f => f.id !== actorId);

  if (filtered.length < followers.length) {
    await saveFollowers(filtered);
    console.log(`Removed follower: ${actorId}`);
  }
}

/**
 * Get followers collection
 * @param {number} page - Page number (optional)
 * @param {number} perPage - Items per page
 * @returns {Promise<Object>} ActivityPub OrderedCollection
 */
async function getFollowers(page = null, perPage = 20) {
  const followers = await loadFollowers();
  const baseUrl = `https://${DOMAIN}/actor/${ACTOR_USERNAME}/followers`;

  // Return collection summary
  if (page === null) {
    return {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: baseUrl,
      type: 'OrderedCollection',
      totalItems: followers.length,
      first: `${baseUrl}?page=1`,
      last: `${baseUrl}?page=${Math.ceil(followers.length / perPage)}`
    };
  }

  // Return page
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const pageFollowers = followers.slice(startIndex, endIndex);

  return {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${baseUrl}?page=${page}`,
    type: 'OrderedCollectionPage',
    partOf: baseUrl,
    orderedItems: pageFollowers.map(f => f.id),
    prev: page > 1 ? `${baseUrl}?page=${page - 1}` : undefined,
    next: endIndex < followers.length ? `${baseUrl}?page=${page + 1}` : undefined
  };
}

/**
 * Log an activity
 * @param {Object} activity - Activity to log
 */
async function logActivity(activity) {
  try {
    const dir = path.dirname(ACTIVITIES_PATH);
    await fs.mkdir(dir, { recursive: true });

    let activities = [];
    try {
      const data = await fs.readFile(ACTIVITIES_PATH, 'utf8');
      const json = JSON.parse(data);
      activities = json.activities || [];
    } catch (error) {
      // File doesn't exist yet
    }

    activities.push({
      ...activity,
      timestamp: new Date().toISOString()
    });

    // Keep only last 1000 activities
    if (activities.length > 1000) {
      activities = activities.slice(-1000);
    }

    await fs.writeFile(ACTIVITIES_PATH, JSON.stringify({ activities }, null, 2));
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  DOMAIN,
  ACTOR_USERNAME,
  getActor,
  getWebFinger,
  linkToNote,
  wrapInCreateActivity,
  getOutbox,
  loadFollowers,
  saveFollowers,
  addFollower,
  removeFollower,
  getFollowers,
  logActivity
};
