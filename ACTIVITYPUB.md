# ActivityPub Integration for Link Blog

## Overview

This document describes the ActivityPub/Fediverse integration for the link blog, enabling it to be followed from Mastodon and other Fediverse instances.

## Architecture

### Core Concepts

**ActivityPub** is a decentralized social networking protocol that allows different servers to communicate. Key components:

1. **Actor**: The blog itself (you@newsfeeds.net)
2. **Activities**: Actions like Create, Follow, Accept, Reject
3. **Objects**: Things being shared (your link posts as Notes)
4. **Inbox**: Where you receive activities from followers
5. **Outbox**: Where you publish your activities

### Domain Configuration

- **Primary Domain**: newsfeeds.net
- **Actor Handle**: @mediaeater@newsfeeds.net (or similar)
- **Actor URL**: https://newsfeeds.net/actor/mediaeater

### Endpoints

#### 1. WebFinger Discovery
```
GET /.well-known/webfinger?resource=acct:mediaeater@newsfeeds.net
```
Returns JSON Resource Descriptor (JRD) pointing to the Actor.

**Response:**
```json
{
  "subject": "acct:mediaeater@newsfeeds.net",
  "links": [
    {
      "rel": "self",
      "type": "application/activity+json",
      "href": "https://newsfeeds.net/actor/mediaeater"
    }
  ]
}
```

#### 2. Actor Profile
```
GET /actor/mediaeater
Accept: application/activity+json
```
Returns the Actor object with profile information.

**Response:**
```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://newsfeeds.net/actor/mediaeater",
  "type": "Person",
  "preferredUsername": "mediaeater",
  "name": "mediaeater - dispute the text",
  "summary": "A curated collection of interesting links and resources",
  "inbox": "https://newsfeeds.net/actor/mediaeater/inbox",
  "outbox": "https://newsfeeds.net/actor/mediaeater/outbox",
  "followers": "https://newsfeeds.net/actor/mediaeater/followers",
  "publicKey": {
    "id": "https://newsfeeds.net/actor/mediaeater#main-key",
    "owner": "https://newsfeeds.net/actor/mediaeater",
    "publicKeyPem": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
  },
  "icon": {
    "type": "Image",
    "mediaType": "image/png",
    "url": "https://newsfeeds.net/favicon.ico"
  }
}
```

#### 3. Outbox (Published Posts)
```
GET /actor/mediaeater/outbox
Accept: application/activity+json
```
Returns an OrderedCollection of Create activities for link posts.

**Response:**
```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://newsfeeds.net/actor/mediaeater/outbox",
  "type": "OrderedCollection",
  "totalItems": 150,
  "first": "https://newsfeeds.net/actor/mediaeater/outbox?page=1"
}
```

**Page Response:**
```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://newsfeeds.net/actor/mediaeater/outbox?page=1",
  "type": "OrderedCollectionPage",
  "partOf": "https://newsfeeds.net/actor/mediaeater/outbox",
  "orderedItems": [
    {
      "id": "https://newsfeeds.net/activity/1760813566283",
      "type": "Create",
      "actor": "https://newsfeeds.net/actor/mediaeater",
      "published": "2025-10-18T18:52:46.283Z",
      "to": ["https://www.w3.org/ns/activitystreams#Public"],
      "cc": ["https://newsfeeds.net/actor/mediaeater/followers"],
      "object": {
        "id": "https://newsfeeds.net/note/1760813566283",
        "type": "Note",
        "published": "2025-10-18T18:52:46.283Z",
        "attributedTo": "https://newsfeeds.net/actor/mediaeater",
        "content": "<p><a href=\"https://www.newyorker.com/...\">The Hunt for the World's Oldest Story</a></p><blockquote>The key that Casaubon craved...</blockquote>",
        "url": "https://newsfeeds.net/note/1760813566283",
        "tag": [
          {"type": "Hashtag", "name": "#stories"}
        ]
      }
    }
  ]
}
```

#### 4. Inbox (Receive Activities)
```
POST /actor/mediaeater/inbox
Content-Type: application/activity+json
```
Receives Follow, Undo, Like, etc. activities from other actors.

**Follow Request:**
```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://mastodon.social/users/alice#follows/123",
  "type": "Follow",
  "actor": "https://mastodon.social/users/alice",
  "object": "https://newsfeeds.net/actor/mediaeater"
}
```

**Response (Accept):**
```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://newsfeeds.net/activity/accept-123",
  "type": "Accept",
  "actor": "https://newsfeeds.net/actor/mediaeater",
  "object": {
    "id": "https://mastodon.social/users/alice#follows/123",
    "type": "Follow",
    "actor": "https://mastodon.social/users/alice",
    "object": "https://newsfeeds.net/actor/mediaeater"
  }
}
```

#### 5. Followers Collection
```
GET /actor/mediaeater/followers
Accept: application/activity+json
```
Returns list of followers (may be private).

## Data Storage

### Followers Database
Stored in `data/activitypub/followers.json`:
```json
{
  "followers": [
    {
      "id": "https://mastodon.social/users/alice",
      "inbox": "https://mastodon.social/users/alice/inbox",
      "followedAt": "2025-10-18T12:00:00.000Z",
      "name": "Alice",
      "preferredUsername": "alice"
    }
  ],
  "lastUpdated": "2025-10-18T12:00:00.000Z"
}
```

### Cryptographic Keys
Stored in `data/activitypub/keys.json`:
```json
{
  "privateKey": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
  "publicKey": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
  "createdAt": "2025-10-18T12:00:00.000Z"
}
```

### Activity Log
Stored in `data/activitypub/activities.json`:
```json
{
  "activities": [
    {
      "id": "unique-id",
      "type": "Follow",
      "actor": "https://mastodon.social/users/alice",
      "timestamp": "2025-10-18T12:00:00.000Z",
      "status": "accepted"
    }
  ]
}
```

## Link to ActivityPub Note Conversion

Each link from `data/links.json` becomes a Note object:

```javascript
{
  id: link.id,
  url: link.url,
  source: link.source,
  pullQuote: link.pullQuote,
  tags: link.tags,
  timestamp: link.timestamp
}
// Converts to:
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": `https://newsfeeds.net/note/${link.id}`,
  "type": "Note",
  "published": link.timestamp,
  "attributedTo": "https://newsfeeds.net/actor/mediaeater",
  "content": `<p><a href="${link.url}">${link.source}</a></p>${link.pullQuote ? `<blockquote>${link.pullQuote}</blockquote>` : ''}`,
  "url": `https://newsfeeds.net/note/${link.id}`,
  "tag": link.tags.map(tag => ({
    "type": "Hashtag",
    "name": `#${tag}`
  }))
}
```

## HTTP Signatures

ActivityPub requires HTTP signatures for authenticated requests. Implementation uses:
- RSA-SHA256 signature algorithm
- Signs: (request-target), host, date, digest headers
- Verification of incoming activities

**Signature Header Example:**
```
Signature: keyId="https://newsfeeds.net/actor/mediaeater#main-key",headers="(request-target) host date digest",signature="..."
```

## Security Considerations

1. **Signature Verification**: All incoming activities MUST be verified
2. **Rate Limiting**: Prevent spam follows/unfollows
3. **Content Validation**: Sanitize all incoming data
4. **HTTPS Only**: All ActivityPub communication requires HTTPS
5. **Actor Verification**: Fetch and verify remote actors before accepting follows

## Delivery to Followers

When a new link is added:

1. Create a Note object from the link
2. Wrap in a Create activity
3. For each follower:
   - Sign the request with HTTP signature
   - POST to follower's inbox
   - Log delivery status

**Delivery Flow:**
```
New Link Added → Create Note → Wrap in Create Activity → Sign Request → POST to Follower Inboxes
```

## Integration with Existing System

### Modified Files
1. `server.cjs` - Add ActivityPub routes
2. `data/activitypub/` - New directory for ActivityPub data

### New Files
1. `services/activitypub.cjs` - Core ActivityPub logic
2. `services/crypto.cjs` - Key generation and signature handling
3. `services/delivery.cjs` - Activity delivery to followers

### Hooks
- When `POST /api/save-links` is called, trigger activity delivery
- Can be made async to not block the save operation

## Testing

### Manual Testing with Mastodon

1. Deploy server with ActivityPub endpoints
2. Search for `@mediaeater@newsfeeds.net` from Mastodon
3. Click "Follow"
4. Mastodon sends Follow activity to inbox
5. Server responds with Accept
6. New links appear in Mastodon timeline

### Testing with curl

```bash
# Test WebFinger
curl -H "Accept: application/jrd+json" \
  "https://newsfeeds.net/.well-known/webfinger?resource=acct:mediaeater@newsfeeds.net"

# Test Actor
curl -H "Accept: application/activity+json" \
  "https://newsfeeds.net/actor/mediaeater"

# Test Outbox
curl -H "Accept: application/activity+json" \
  "https://newsfeeds.net/actor/mediaeater/outbox"
```

## Deployment Checklist

- [ ] Generate RSA keypair for signing
- [ ] Configure domain (newsfeeds.net)
- [ ] Set up HTTPS (required for ActivityPub)
- [ ] Create ActivityPub data directories
- [ ] Deploy server with new routes
- [ ] Test WebFinger discovery
- [ ] Test Follow/Unfollow flow
- [ ] Verify signature generation/verification
- [ ] Test delivery to real Mastodon instance
- [ ] Monitor activity logs

## Future Enhancements

1. **Backfill**: Automatically post recent links to new followers
2. **Replies**: Support for receiving replies/comments
3. **Likes/Boosts**: Track engagement from Fediverse
4. **Admin UI**: Web interface to manage followers
5. **Analytics**: Track which links get most engagement
6. **Moderation**: Block/unblock followers
7. **Multiple Actors**: Support different topic-based actors
8. **Custom Emojis**: Add custom emoji support
9. **Attachments**: Include link previews as images
10. **Collections**: Organize links by tag in separate collections

## References

- [ActivityPub Spec](https://www.w3.org/TR/activitypub/)
- [ActivityStreams Vocabulary](https://www.w3.org/TR/activitystreams-vocabulary/)
- [WebFinger Spec](https://tools.ietf.org/html/rfc7033)
- [HTTP Signatures](https://datatracker.ietf.org/doc/html/draft-cavage-http-signatures)
- [Mastodon API Docs](https://docs.joinmastodon.org/spec/activitypub/)
