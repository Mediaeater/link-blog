# ActivityPub Setup and Testing Guide

## Quick Start

### 1. Installation

No new dependencies needed - all required Node.js modules are already included:
- `crypto` (built-in)
- `https` (built-in)
- `express` (already installed)

### 2. Initialize ActivityPub

Run the setup script to generate keys and create data directories:

```bash
node scripts/setup-activitypub.cjs
```

This will:
- Create `data/activitypub/` directory
- Generate RSA keypair in `data/activitypub/keys.json`
- Initialize `data/activitypub/followers.json`
- Initialize `data/activitypub/activities.json`

### 3. Start the Server

```bash
npm run dev:save
# or
node server.cjs
```

The server will now include ActivityPub endpoints.

## Local Testing

### Test WebFinger Discovery

```bash
curl -H "Accept: application/jrd+json" \
  "http://localhost:3001/.well-known/webfinger?resource=acct:mediaeater@newsfeeds.net"
```

Expected response:
```json
{
  "subject": "acct:mediaeater@newsfeeds.net",
  "aliases": ["https://newsfeeds.net/actor/mediaeater"],
  "links": [
    {
      "rel": "self",
      "type": "application/activity+json",
      "href": "https://newsfeeds.net/actor/mediaeater"
    }
  ]
}
```

### Test Actor Profile

```bash
curl -H "Accept: application/activity+json" \
  "http://localhost:3001/actor/mediaeater"
```

Expected response includes actor profile with public key.

### Test Outbox

```bash
curl -H "Accept: application/activity+json" \
  "http://localhost:3001/actor/mediaeater/outbox"
```

Expected response shows collection of published links.

### Test Individual Note

```bash
# Get a link ID from your links.json
curl -H "Accept: application/activity+json" \
  "http://localhost:3001/note/1760813566283"
```

## Production Deployment

### Prerequisites

1. **Domain**: Ensure `newsfeeds.net` points to your server
2. **HTTPS**: ActivityPub REQUIRES HTTPS - use Let's Encrypt or similar
3. **Ports**: Open port 443 (HTTPS)

### Deployment Steps

#### Option A: Nginx Reverse Proxy

1. Install Nginx and Certbot:
```bash
sudo apt-get update
sudo apt-get install nginx certbot python3-certbot-nginx
```

2. Configure Nginx (`/etc/nginx/sites-available/newsfeeds.net`):
```nginx
server {
    server_name newsfeeds.net;

    location / {
        root /var/www/link-blog/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /actor/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /.well-known/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }

    location /note/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }

    location /inbox {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        client_max_body_size 10M;
    }

    location ~ \.(xml|json)$ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }

    listen 80;
}
```

3. Enable site and get SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/newsfeeds.net /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d newsfeeds.net
```

4. Start server with PM2:
```bash
npm install -g pm2
pm2 start server.cjs --name linkblog-api
pm2 save
pm2 startup
```

#### Option B: Direct Node.js with HTTPS

Modify `server.cjs` to use HTTPS:

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('/path/to/privkey.pem'),
  cert: fs.readFileSync('/path/to/fullchain.pem')
};

https.createServer(options, app).listen(443, () => {
  console.log('HTTPS server running on port 443');
});
```

### Configuration Changes for Production

1. Update `services/activitypub.cjs`:
   - Verify `DOMAIN` is set to `newsfeeds.net`
   - Verify `ACTOR_USERNAME` matches your preferred handle

2. Update CORS settings in `server.cjs` if needed

3. Set proper file permissions:
```bash
chmod 600 data/activitypub/keys.json  # Protect private key
```

## Testing with Mastodon

### Step 1: Search for Your Actor

From any Mastodon instance:
1. Click search
2. Enter: `@mediaeater@newsfeeds.net`
3. Your actor should appear

### Step 2: Follow

1. Click "Follow"
2. Mastodon sends a Follow activity to your inbox
3. Your server automatically accepts and responds
4. Check logs: `tail -f data/activitypub/activities.json`

### Step 3: Verify Follower

```bash
curl -H "Accept: application/activity+json" \
  "https://newsfeeds.net/actor/mediaeater/followers"
```

Should show the follower count.

### Step 4: Deliver a Link

Manually trigger delivery:
```bash
node scripts/deliver-links.cjs 1
```

The link should appear in your Mastodon timeline!

## Automatic Delivery on New Links

To automatically deliver new links when they're added, modify the save endpoint:

```javascript
// In server.cjs, after saving links
app.post('/api/save-links', async (req, res) => {
  try {
    // ... existing save logic ...

    // Deliver new links to followers (async, don't block response)
    const { deliverNewLinks } = require('./services/delivery.cjs');

    // Get newly added links (compare with previous state)
    // For simplicity, deliver the most recent link
    const newLinks = data.links.slice(0, 1);

    deliverNewLinks(newLinks).catch(err => {
      console.error('Background delivery error:', err);
    });

    res.json({ success: true, ... });
  } catch (error) {
    // ... error handling ...
  }
});
```

## Monitoring

### Check Followers

```bash
cat data/activitypub/followers.json | jq '.followers | length'
```

### View Activity Log

```bash
cat data/activitypub/activities.json | jq '.activities | .[-10:]'
```

### Server Logs

```bash
pm2 logs linkblog-api
# or
tail -f /var/log/nginx/access.log
```

## Troubleshooting

### "Actor not found" in Mastodon

1. Check WebFinger responds correctly:
```bash
curl -v "https://newsfeeds.net/.well-known/webfinger?resource=acct:mediaeater@newsfeeds.net"
```

2. Verify HTTPS is working
3. Check Content-Type headers are correct
4. Ensure no CORS is blocking the request

### "Follow didn't work"

1. Check inbox endpoint is accessible:
```bash
curl -X POST -H "Content-Type: application/activity+json" \
  "https://newsfeeds.net/actor/mediaeater/inbox" \
  -d '{"type":"Test"}'
```

2. Check server logs for errors
3. Verify HTTP signatures are being created correctly

### "Links not appearing in timeline"

1. Check delivery logs:
```bash
node scripts/deliver-links.cjs 1
```

2. Verify followers list is populated
3. Check that follower inbox URLs are correct
4. Ensure HTTP signatures are valid

### Signature Verification Errors

1. Ensure system clock is accurate (HTTP signatures use timestamps)
2. Verify public key in actor profile matches private key
3. Check that all required headers are being signed

## Security Considerations

### 1. Protect Private Key

```bash
chmod 600 data/activitypub/keys.json
```

Never commit this file to git:
```bash
echo "data/activitypub/keys.json" >> .gitignore
```

### 2. Rate Limiting

Add rate limiting to inbox:

```javascript
const rateLimit = require('express-rate-limit');

const inboxLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.post('/actor/:username/inbox', inboxLimiter, ...);
```

### 3. Input Validation

The implementation includes basic validation, but consider:
- URL validation for remote actors
- Content sanitization for incoming activities
- Size limits on inbox payloads

### 4. Signature Verification

Currently accepts all follows. To verify signatures:

```javascript
// In routes/activitypub.cjs, inbox handler
const signatureHeader = req.get('Signature');
if (signatureHeader) {
  const actor = await fetchActor(activity.actor);
  const valid = verifySignature(actor.publicKey.publicKeyPem, req, signatureHeader);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
}
```

## Maintenance

### Backup Important Files

```bash
# Backup followers and keys
tar -czf activitypub-backup-$(date +%Y%m%d).tar.gz data/activitypub/
```

### Rotate Keys (if compromised)

```bash
# Delete old keys
rm data/activitypub/keys.json

# Generate new keys
node scripts/setup-activitypub.cjs

# Followers will need to re-follow
```

### Clean Old Activity Logs

The activities log is automatically limited to 1000 entries, but you can manually clean:

```bash
node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync('data/activitypub/activities.json'));
  data.activities = data.activities.slice(-100);
  fs.writeFileSync('data/activitypub/activities.json', JSON.stringify(data, null, 2));
"
```

## Advanced Features

### Backfill for New Followers

When someone follows, send them recent posts:

```javascript
// In routes/activitypub.cjs, after accepting follow
const recentLinks = sortedLinks.slice(0, 10);
for (const link of recentLinks) {
  await deliverNewLink(link);
  await new Promise(r => setTimeout(r, 1000));
}
```

### Analytics

Track engagement:

```javascript
// Count likes and announces
const stats = activities.reduce((acc, act) => {
  if (act.type === 'Like') acc.likes++;
  if (act.type === 'Announce') acc.boosts++;
  return acc;
}, { likes: 0, boosts: 0 });
```

### Multiple Actors

Create topic-specific actors:
- `ai@newsfeeds.net` - AI-tagged links only
- `politics@newsfeeds.net` - Politics-tagged links only

## Resources

- [ActivityPub Spec](https://www.w3.org/TR/activitypub/)
- [Mastodon API Docs](https://docs.joinmastodon.org/)
- [WebFinger RFC](https://tools.ietf.org/html/rfc7033)
- [HTTP Signatures Draft](https://datatracker.ietf.org/doc/html/draft-cavage-http-signatures)

## Support

For issues:
1. Check server logs
2. Verify HTTPS is working
3. Test endpoints with curl
4. Review activity logs in `data/activitypub/activities.json`
