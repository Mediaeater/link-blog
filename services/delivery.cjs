const https = require('https');
const http = require('http');
const { getKeyPair, createSignature, createDigest } = require('./crypto.cjs');
const { DOMAIN, ACTOR_USERNAME, loadFollowers, logActivity } = require('./activitypub.cjs');

/**
 * Activity delivery service
 * Handles sending activities to follower inboxes with HTTP signatures
 */

/**
 * Fetch remote actor profile
 * @param {string} actorUrl - URL of the actor
 * @returns {Promise<Object>} Actor object
 */
async function fetchActor(actorUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(actorUrl);
    const protocol = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Accept': 'application/activity+json, application/ld+json',
        'User-Agent': `LinkBlog/${DOMAIN}`
      }
    };

    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Failed to parse actor JSON: ${error.message}`));
          }
        } else {
          reject(new Error(`Failed to fetch actor: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Send an activity to an inbox
 * @param {string} inboxUrl - URL of the inbox
 * @param {Object} activity - Activity object to send
 * @returns {Promise<Object>} Response details
 */
async function sendToInbox(inboxUrl, activity) {
  const { privateKey } = await getKeyPair();
  const keyId = `https://${DOMAIN}/actor/${ACTOR_USERNAME}#main-key`;

  const body = JSON.stringify(activity);
  const digest = createDigest(body);

  const url = new URL(inboxUrl);
  const protocol = url.protocol === 'https:' ? https : http;

  const date = new Date().toUTCString();

  const headers = {
    'Host': url.host,
    'Date': date,
    'Digest': digest,
    'Content-Type': 'application/activity+json',
    'Content-Length': Buffer.byteLength(body),
    'User-Agent': `LinkBlog/${DOMAIN}`
  };

  // Create signature
  const signature = createSignature(privateKey, keyId, {
    method: 'POST',
    url: inboxUrl,
    headers,
    body
  });

  headers['Signature'] = signature;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'POST',
      headers
    };

    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Send an Accept activity in response to a Follow
 * @param {Object} followActivity - The Follow activity to accept
 * @param {string} followerInbox - Inbox URL of the follower
 * @returns {Promise<void>}
 */
async function sendAccept(followActivity, followerInbox) {
  const acceptActivity = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `https://${DOMAIN}/activity/accept-${Date.now()}`,
    type: 'Accept',
    actor: `https://${DOMAIN}/actor/${ACTOR_USERNAME}`,
    object: followActivity
  };

  try {
    const response = await sendToInbox(followerInbox, acceptActivity);
    console.log(`Sent Accept to ${followerInbox}: ${response.statusCode}`);

    await logActivity({
      type: 'Accept',
      activityId: acceptActivity.id,
      targetInbox: followerInbox,
      status: response.statusCode
    });
  } catch (error) {
    console.error(`Failed to send Accept to ${followerInbox}:`, error.message);
    throw error;
  }
}

/**
 * Send a Reject activity in response to a Follow
 * @param {Object} followActivity - The Follow activity to reject
 * @param {string} followerInbox - Inbox URL of the follower
 * @returns {Promise<void>}
 */
async function sendReject(followActivity, followerInbox) {
  const rejectActivity = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `https://${DOMAIN}/activity/reject-${Date.now()}`,
    type: 'Reject',
    actor: `https://${DOMAIN}/actor/${ACTOR_USERNAME}`,
    object: followActivity
  };

  try {
    const response = await sendToInbox(followerInbox, rejectActivity);
    console.log(`Sent Reject to ${followerInbox}: ${response.statusCode}`);

    await logActivity({
      type: 'Reject',
      activityId: rejectActivity.id,
      targetInbox: followerInbox,
      status: response.statusCode
    });
  } catch (error) {
    console.error(`Failed to send Reject to ${followerInbox}:`, error.message);
    throw error;
  }
}

/**
 * Deliver a Create activity to all followers
 * @param {Object} createActivity - The Create activity to deliver
 * @returns {Promise<Object>} Delivery results
 */
async function deliverToFollowers(createActivity) {
  const followers = await loadFollowers();

  if (followers.length === 0) {
    console.log('No followers to deliver to');
    return { total: 0, success: 0, failed: 0 };
  }

  console.log(`Delivering activity to ${followers.length} followers...`);

  const results = {
    total: followers.length,
    success: 0,
    failed: 0,
    errors: []
  };

  // Deliver to each follower (use shared inbox if available for efficiency)
  const inboxes = new Set();
  const inboxToFollowers = new Map();

  followers.forEach(follower => {
    const inbox = follower.sharedInbox || follower.inbox;
    inboxes.add(inbox);

    if (!inboxToFollowers.has(inbox)) {
      inboxToFollowers.set(inbox, []);
    }
    inboxToFollowers.get(inbox).push(follower);
  });

  // Send to each unique inbox
  for (const inbox of inboxes) {
    try {
      const response = await sendToInbox(inbox, createActivity);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        results.success++;
        console.log(`✓ Delivered to ${inbox}: ${response.statusCode}`);
      } else {
        results.failed++;
        results.errors.push({ inbox, statusCode: response.statusCode });
        console.log(`✗ Failed to deliver to ${inbox}: ${response.statusCode}`);
      }

      await logActivity({
        type: 'Deliver',
        activityId: createActivity.id,
        targetInbox: inbox,
        status: response.statusCode
      });
    } catch (error) {
      results.failed++;
      results.errors.push({ inbox, error: error.message });
      console.error(`✗ Error delivering to ${inbox}:`, error.message);
    }

    // Rate limiting: small delay between deliveries
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`Delivery complete: ${results.success} success, ${results.failed} failed`);
  return results;
}

/**
 * Deliver a new link as a Create activity to all followers
 * @param {Object} link - Link object from links.json
 * @returns {Promise<Object>} Delivery results
 */
async function deliverNewLink(link) {
  const { linkToNote, wrapInCreateActivity } = require('./activitypub.cjs');

  const note = linkToNote(link);
  const createActivity = wrapInCreateActivity(note);

  return deliverToFollowers(createActivity);
}

/**
 * Deliver multiple new links to followers
 * @param {Array} links - Array of link objects
 * @returns {Promise<Array>} Array of delivery results
 */
async function deliverNewLinks(links) {
  const results = [];

  for (const link of links) {
    const result = await deliverNewLink(link);
    results.push({ link: link.id, ...result });

    // Delay between different activities
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

module.exports = {
  fetchActor,
  sendToInbox,
  sendAccept,
  sendReject,
  deliverToFollowers,
  deliverNewLink,
  deliverNewLinks
};
