# ActivityPub & Fediverse Integration

## Overview

The link blog includes ActivityPub/Fediverse integration, enabling it to be followed from Mastodon and other Fediverse instances. Your blog can publish link updates as federated posts that appear in followers' timelines.

## Current Status

**Implementation**: ✅ Complete
**Activation**: ⏸️ Requires HTTPS production domain
**Code Location**: `/services/activitypub.cjs`, `/routes/activitypub.cjs`

### What's Implemented

- ✅ WebFinger discovery (`.well-known/webfinger`)
- ✅ Actor profile endpoint
- ✅ Inbox for receiving activities (Follow, Undo, etc.)
- ✅ Outbox for publishing activities
- ✅ HTTP Signature authentication
- ✅ Link → Note conversion
- ✅ Follower management
- ✅ Activity delivery to followers' inboxes

### What's Required to Activate

1. **Production HTTPS domain** (e.g., newsfeeds.net)
2. **Configure DNS** to point to your server
3. **Generate RSA keys** for HTTP signatures
4. **Start the server** with production configuration

## Architecture

### Core Concepts

**ActivityPub** is a decentralized social networking protocol. Key components:

1. **Actor**: Your blog identity (@mediaeater@newsfeeds.net)
2. **Activities**: Actions like Create, Follow, Accept, Reject
3. **Objects**: Your links as "Note" objects
4. **Inbox**: Receives activities from followers
5. **Outbox**: Publishes your activities

### Endpoints

#### WebFinger Discovery
```
GET /.well-known/webfinger?resource=acct:mediaeater@newsfeeds.net
```
Returns JSON Resource Descriptor pointing to your Actor profile.

#### Actor Profile
```
GET /actor/mediaeater
Accept: application/activity+json
```
Returns your blog's ActivityPub profile.

#### Inbox (Receiving)
```
POST /inbox
Content-Type: application/activity+json
```
Receives Follow requests and other activities from remote servers.

#### Outbox (Publishing)
```
GET /outbox
Accept: application/activity+json
```
Lists your published activities (link posts).

## Setup Instructions

### 1. Generate Cryptographic Keys

```bash
npm run activitypub:setup
```

This creates RSA key pair at `data/activitypub/keys.json`.

### 2. Configure Domain

Update `/services/activitypub.cjs` with your domain:

```javascript
const DOMAIN = 'newsfeeds.net';  // Your production domain
const ACTOR_USERNAME = 'mediaeater';
```

### 3. Deploy to Production

The server must run on HTTPS:
- ActivityPub requires HTTPS for security
- Certificate required (Let's Encrypt recommended)
- Update DNS to point to your server

### 4. Start Server

```bash
# Production mode
PORT=443 npm start
```

### 5. Test Discovery

From any Mastodon instance:
1. Search for: `@mediaeater@newsfeeds.net`
2. Click Follow
3. Your link posts will appear in their timeline

## Publishing Links

When you add a link in admin mode, it automatically:
1. Converts link → ActivityPub Note object
2. Creates a Create activity
3. Delivers to all followers' inboxes

### Manual Delivery

```bash
npm run activitypub:deliver
```

Sends recent links to all current followers.

## Data Storage

Followers and activities stored in:
```
data/activitypub/
├── keys.json          # RSA private/public keys
├── followers.json     # List of followers
└── activities.json    # Activity log
```

## Troubleshooting

### "Domain not reachable"
- Ensure HTTPS is configured
- Check DNS points to correct server
- Verify port 443 is open

### "Signature verification failed"
- Regenerate keys: `npm run activitypub:setup`
- Check server time is synchronized (NTP)

### "Inbox not receiving"
- Check server logs for errors
- Verify Content-Type headers
- Test with ActivityPub validator

## Status Check

```bash
npm run activitypub:status
```

Shows:
- Current configuration
- Number of followers
- Recent activities
- Server health

## Security Considerations

1. **HTTP Signatures**: All requests signed with private key
2. **HTTPS Required**: Prevents man-in-the-middle attacks
3. **Key Storage**: Keep `keys.json` secure and backed up
4. **Follower Validation**: Incoming followers verified via HTTP signatures

## For More Information

- [ActivityPub Spec](https://www.w3.org/TR/activitypub/)
- [Mastodon Federation Guide](https://docs.joinmastodon.org/spec/activitypub/)
- [HTTP Signatures](https://tools.ietf.org/html/draft-cavage-http-signatures)

## Current Limitations

- ⚠️ Requires production domain (GitHub Pages doesn't support ActivityPub)
- ⚠️ Single-user mode only
- ⚠️ No threading/replies (links published as standalone notes)
- ℹ️ Follower list not displayed in UI (backend only)

## Future Enhancements

- [ ] Display follower count in UI
- [ ] Support for hashtag following
- [ ] Link preview cards in federated posts
- [ ] Custom post templates
