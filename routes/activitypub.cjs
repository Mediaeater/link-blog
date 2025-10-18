const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const {
  getActor,
  getWebFinger,
  getOutbox,
  getFollowers,
  addFollower,
  removeFollower,
  logActivity,
  linkToNote
} = require('../services/activitypub.cjs');
const {
  fetchActor,
  sendAccept,
  sendReject
} = require('../services/delivery.cjs');
const { verifySignature } = require('../services/crypto.cjs');

const router = express.Router();

/**
 * Middleware to check if request accepts ActivityPub content
 */
function requireActivityPubContent(req, res, next) {
  const accept = req.get('Accept') || '';

  if (accept.includes('application/activity+json') ||
      accept.includes('application/ld+json') ||
      accept.includes('application/json')) {
    next();
  } else {
    res.status(406).json({
      error: 'Not Acceptable',
      message: 'This endpoint requires Accept: application/activity+json'
    });
  }
}

/**
 * WebFinger endpoint for actor discovery
 * GET /.well-known/webfinger?resource=acct:mediaeater@newsfeeds.net
 */
router.get('/.well-known/webfinger', (req, res) => {
  const resource = req.query.resource;

  if (!resource) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'resource parameter is required'
    });
  }

  const webfinger = getWebFinger(resource);

  if (!webfinger) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Resource not found'
    });
  }

  res.set('Content-Type', 'application/jrd+json; charset=utf-8');
  res.json(webfinger);
});

/**
 * Actor profile endpoint
 * GET /actor/:username
 */
router.get('/actor/:username', requireActivityPubContent, async (req, res) => {
  try {
    const actor = await getActor();

    res.set('Content-Type', 'application/activity+json; charset=utf-8');
    res.json(actor);
  } catch (error) {
    console.error('Error getting actor:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get actor profile'
    });
  }
});

/**
 * Outbox endpoint (published posts)
 * GET /actor/:username/outbox
 */
router.get('/actor/:username/outbox', requireActivityPubContent, async (req, res) => {
  try {
    // Load links
    const dataPath = path.join(__dirname, '..', 'data', 'links.json');
    const content = await fs.readFile(dataPath, 'utf8');
    const data = JSON.parse(content);

    const page = req.query.page ? parseInt(req.query.page) : null;
    const outbox = getOutbox(data.links || [], page);

    res.set('Content-Type', 'application/activity+json; charset=utf-8');
    res.json(outbox);
  } catch (error) {
    console.error('Error getting outbox:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get outbox'
    });
  }
});

/**
 * Followers endpoint
 * GET /actor/:username/followers
 */
router.get('/actor/:username/followers', requireActivityPubContent, async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page) : null;
    const followers = await getFollowers(page);

    res.set('Content-Type', 'application/activity+json; charset=utf-8');
    res.json(followers);
  } catch (error) {
    console.error('Error getting followers:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get followers'
    });
  }
});

/**
 * Following endpoint (empty for now, as the blog doesn't follow anyone)
 * GET /actor/:username/following
 */
router.get('/actor/:username/following', requireActivityPubContent, async (req, res) => {
  res.set('Content-Type', 'application/activity+json; charset=utf-8');
  res.json({
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `https://${req.get('host')}/actor/${req.params.username}/following`,
    type: 'OrderedCollection',
    totalItems: 0,
    orderedItems: []
  });
});

/**
 * Individual note endpoint
 * GET /note/:id
 */
router.get('/note/:id', requireActivityPubContent, async (req, res) => {
  try {
    // Load links
    const dataPath = path.join(__dirname, '..', 'data', 'links.json');
    const content = await fs.readFile(dataPath, 'utf8');
    const data = JSON.parse(content);

    // Find link by ID
    const linkId = parseFloat(req.params.id);
    const link = (data.links || []).find(l => l.id === linkId);

    if (!link) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Note not found'
      });
    }

    const note = linkToNote(link);

    res.set('Content-Type', 'application/activity+json; charset=utf-8');
    res.json(note);
  } catch (error) {
    console.error('Error getting note:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get note'
    });
  }
});

/**
 * Inbox endpoint (receive activities from other actors)
 * POST /actor/:username/inbox
 */
router.post('/actor/:username/inbox', express.json({ type: ['application/activity+json', 'application/ld+json'] }), async (req, res) => {
  try {
    const activity = req.body;

    if (!activity || !activity.type) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid activity'
      });
    }

    console.log('Received activity:', activity.type, 'from', activity.actor);

    // Log the activity
    await logActivity({
      type: activity.type,
      actor: activity.actor,
      activityId: activity.id,
      received: true
    });

    // Handle different activity types
    switch (activity.type) {
      case 'Follow': {
        // Fetch the follower's actor profile
        const follower = await fetchActor(activity.actor);

        // Add to followers
        await addFollower(follower);

        // Send Accept activity
        await sendAccept(activity, follower.inbox);

        console.log(`Accepted follow from ${follower.preferredUsername}`);
        break;
      }

      case 'Undo': {
        // Handle Undo activities (like unfollows)
        if (activity.object && activity.object.type === 'Follow') {
          await removeFollower(activity.actor);
          console.log(`Removed follower: ${activity.actor}`);
        }
        break;
      }

      case 'Like':
      case 'Announce': {
        // Log likes and boosts for analytics
        console.log(`Received ${activity.type} from ${activity.actor}`);
        break;
      }

      default: {
        console.log(`Unhandled activity type: ${activity.type}`);
      }
    }

    // Always return 202 Accepted for async processing
    res.status(202).json({
      status: 'accepted',
      message: 'Activity queued for processing'
    });
  } catch (error) {
    console.error('Error processing inbox activity:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process activity'
    });
  }
});

/**
 * Shared inbox endpoint (more efficient for servers with multiple actors)
 * POST /inbox
 */
router.post('/inbox', express.json({ type: ['application/activity+json', 'application/ld+json'] }), async (req, res) => {
  // For now, just forward to the main actor's inbox logic
  // In a multi-actor system, this would route to the appropriate actor
  req.params.username = 'mediaeater';
  return router.handle(req, res);
});

module.exports = router;
