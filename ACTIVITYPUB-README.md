# ActivityPub Integration for Link Blog

## Overview

This implementation adds full ActivityPub/Fediverse support to the link blog, enabling it to be followed from Mastodon, Pleroma, and other ActivityPub-compatible platforms. When someone follows your blog from the Fediverse, they'll receive your link posts in their timeline.

## Architecture Summary

### Components

```
link-blog/
├── services/
│   ├── activitypub.cjs    # Core ActivityPub logic (Actor, Notes, Collections)
│   ├── crypto.cjs          # RSA keys, HTTP signatures
│   └── delivery.cjs        # Activity delivery to followers
├── routes/
│   └── activitypub.cjs     # Express routes for ActivityPub endpoints
├── scripts/
│   ├── setup-activitypub.cjs      # Initialize keys and databases
│   ├── activitypub-status.cjs     # View followers and statistics
│   └── deliver-links.cjs          # Manually deliver links
└── data/activitypub/
    ├── keys.json           # RSA keypair (NEVER commit!)
    ├── followers.json      # Follower database
    └── activities.json     # Activity log
```

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/.well-known/webfinger` | GET | Actor discovery |
| `/actor/mediaeater` | GET | Actor profile |
| `/actor/mediaeater/outbox` | GET | Published posts (links) |
| `/actor/mediaeater/followers` | GET | Followers list |
| `/actor/mediaeater/inbox` | POST | Receive activities (Follow, Like, etc.) |
| `/note/:id` | GET | Individual note |

## Quick Start

### 1. Setup

```bash
npm run activitypub:setup
```

This generates:
- RSA keypair for signing activities
- Empty followers database
- Activity log

### 2. Start Server

```bash
npm run dev:save
# or
npm run api
```

### 3. Test Locally

```bash
# Test WebFinger
curl -H "Accept: application/jrd+json" \
  "http://localhost:3001/.well-known/webfinger?resource=acct:mediaeater@newsfeeds.net"

# Test Actor
curl -H "Accept: application/activity+json" \
  "http://localhost:3001/actor/mediaeater"

# Test Outbox
curl -H "Accept: application/activity+json" \
  "http://localhost:3001/actor/mediaeater/outbox"
```

### 4. Deploy to Production

See [ACTIVITYPUB-SETUP.md](./ACTIVITYPUB-SETUP.md) for detailed deployment instructions.

## How It Works

### Actor Discovery (WebFinger)

When someone searches for `@mediaeater@newsfeeds.net` on Mastodon:

1. Mastodon queries: `GET /.well-known/webfinger?resource=acct:mediaeater@newsfeeds.net`
2. Server responds with JSON pointing to the Actor URL
3. Mastodon fetches: `GET /actor/mediaeater`
4. Server returns Actor profile with public key

### Following Flow

1. User clicks "Follow" on Mastodon
2. Mastodon sends `POST /actor/mediaeater/inbox` with Follow activity
3. Server fetches follower's actor profile
4. Server adds follower to database
5. Server sends Accept activity to follower's inbox
6. Follower now sees new posts in timeline

### Link Publishing Flow

1. New link added to `data/links.json`
2. Link converted to ActivityPub Note object
3. Note wrapped in Create activity
4. For each follower:
   - Activity signed with HTTP signature
   - POST to follower's inbox
   - Delivery logged

### Data Model

**Link → Note Conversion:**

```javascript
{
  id: 1760813566283,
  url: "https://example.com/article",
  source: "Article Title",
  pullQuote: "Interesting quote...",
  tags: ["ai", "ethics"],
  timestamp: "2025-10-18T18:52:46.283Z"
}

// Becomes:

{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://newsfeeds.net/note/1760813566283",
  "type": "Note",
  "published": "2025-10-18T18:52:46.283Z",
  "attributedTo": "https://newsfeeds.net/actor/mediaeater",
  "content": "<p><a href=\"https://example.com/article\">Article Title</a></p><blockquote>Interesting quote...</blockquote>",
  "tag": [
    {"type": "Hashtag", "name": "#ai"},
    {"type": "Hashtag", "name": "#ethics"}
  ]
}
```

## Usage

### View Status

```bash
npm run activitypub:status
```

Shows:
- Keypair status
- Number of followers
- Recent activities
- Delivery statistics

### Manual Delivery

```bash
# Deliver last link
npm run activitypub:deliver

# Deliver last 5 links
npm run activitypub:deliver 5

# Or directly
node scripts/deliver-links.cjs 5
```

### Automatic Delivery

To automatically deliver new links when saved, modify `server.cjs`:

```javascript
const { deliverNewLinks } = require('./services/delivery.cjs');

app.post('/api/save-links', async (req, res) => {
  // ... existing save logic ...

  // Deliver newest link in background (non-blocking)
  if (data.links && data.links.length > 0) {
    const newestLink = data.links[0]; // Assuming links are sorted newest first
    deliverNewLinks([newestLink]).catch(err => {
      console.error('Delivery error:', err);
    });
  }

  res.json({ success: true, ... });
});
```

## Security Features

### HTTP Signatures

All outgoing activities are signed with RSA-SHA256 signatures, including:
- `(request-target)` - HTTP method and path
- `host` - Target host
- `date` - Request timestamp
- `digest` - SHA-256 hash of body

### Key Management

- Private key stored in `data/activitypub/keys.json`
- File permissions should be `600` (owner read/write only)
- **Never commit this file to git** (already in .gitignore)

### Input Validation

- All incoming activities are validated
- Actor profiles are fetched and verified before accepting follows
- Content is sanitized to prevent XSS

## Monitoring

### Activity Log

All activities (sent and received) are logged to `data/activitypub/activities.json`:

```json
{
  "activities": [
    {
      "type": "Follow",
      "actor": "https://mastodon.social/users/alice",
      "activityId": "https://mastodon.social/...",
      "timestamp": "2025-10-18T12:00:00.000Z",
      "status": "accepted"
    }
  ]
}
```

### Followers Database

Followers stored in `data/activitypub/followers.json`:

```json
{
  "followers": [
    {
      "id": "https://mastodon.social/users/alice",
      "inbox": "https://mastodon.social/users/alice/inbox",
      "sharedInbox": "https://mastodon.social/inbox",
      "followedAt": "2025-10-18T12:00:00.000Z",
      "name": "Alice",
      "preferredUsername": "alice"
    }
  ]
}
```

## Customization

### Change Actor Name

Edit `services/activitypub.cjs`:

```javascript
const ACTOR_USERNAME = 'mediaeater';  // Change this
const ACTOR_NAME = 'mediaeater - dispute the text';  // And this
const ACTOR_SUMMARY = 'A curated collection...';  // And this
```

### Change Domain

Edit `services/activitypub.cjs`:

```javascript
const DOMAIN = 'newsfeeds.net';  // Change this
```

### Filter Links by Tag

Only publish links with specific tags:

```javascript
// In services/activitypub.cjs, modify getOutbox()
function getOutbox(links, page = null, perPage = 20) {
  const filteredLinks = links.filter(link =>
    link.tags.includes('public') // Only publish links tagged 'public'
  );

  const sortedLinks = [...filteredLinks].sort(...);
  // ... rest of function
}
```

## Troubleshooting

### "Actor not found" on Mastodon

**Possible causes:**
- WebFinger endpoint not responding
- HTTPS not configured
- Wrong domain in actor ID
- CORS blocking requests

**Solution:**
```bash
# Test WebFinger locally
curl -v "http://localhost:3001/.well-known/webfinger?resource=acct:mediaeater@newsfeeds.net"

# Test on production
curl -v "https://newsfeeds.net/.well-known/webfinger?resource=acct:mediaeater@newsfeeds.net"
```

### Follow Requests Not Working

**Check:**
1. Inbox endpoint is accessible
2. Server logs show incoming requests
3. HTTP signatures (if you implemented verification)

**Debug:**
```bash
# Watch activity log in real-time
tail -f data/activitypub/activities.json

# Check server logs
npm run api  # Watch console output
```

### Links Not Appearing in Timeline

**Check:**
1. Delivery script runs without errors
2. Followers inbox URLs are correct
3. HTTP signatures are valid

**Test:**
```bash
# Manual delivery with debug output
node scripts/deliver-links.cjs 1

# Check delivery stats
npm run activitypub:status
```

### Signature Errors

**Causes:**
- System clock skew (signatures include timestamps)
- Wrong keypair (public key doesn't match private key)
- Missing headers in signature

**Fix:**
```bash
# Sync system clock
sudo ntpdate -s time.nist.gov

# Regenerate keys
rm data/activitypub/keys.json
npm run activitypub:setup
```

## Performance Considerations

### Delivery Optimization

The implementation uses shared inboxes when available, reducing the number of HTTP requests when multiple followers are on the same instance.

### Rate Limiting

Deliveries include 100ms delays between requests to prevent overwhelming remote servers:

```javascript
// In services/delivery.cjs
await new Promise(resolve => setTimeout(resolve, 100));
```

### Background Processing

For production, consider using a job queue (Bull, BullMQ) for activity delivery:

```javascript
// Pseudocode
await deliveryQueue.add('deliver-link', { linkId: link.id });
```

## Future Enhancements

Potential improvements (not yet implemented):

1. **Replies**: Accept and display replies from followers
2. **Likes/Boosts**: Track engagement metrics
3. **Moderation**: Block/mute followers or instances
4. **Collections**: Group links by tag into separate feeds
5. **Backfill**: Send recent posts to new followers
6. **Admin UI**: Web interface for managing followers
7. **Signature Verification**: Verify incoming activity signatures
8. **Rate Limiting**: Prevent abuse of inbox endpoint
9. **Multi-Actor**: Support multiple topic-based actors
10. **Attachments**: Include link previews as images

## Resources

- **Specification**: [W3C ActivityPub](https://www.w3.org/TR/activitypub/)
- **Vocabulary**: [ActivityStreams 2.0](https://www.w3.org/TR/activitystreams-vocabulary/)
- **Discovery**: [WebFinger RFC 7033](https://tools.ietf.org/html/rfc7033)
- **Signatures**: [HTTP Signatures Draft](https://datatracker.ietf.org/doc/html/draft-cavage-http-signatures)
- **Mastodon Docs**: [ActivityPub Guide](https://docs.joinmastodon.org/spec/activitypub/)

## Support

For detailed deployment instructions, see [ACTIVITYPUB-SETUP.md](./ACTIVITYPUB-SETUP.md)

For architecture details, see [ACTIVITYPUB.md](./ACTIVITYPUB.md)

## License

Same as main project
