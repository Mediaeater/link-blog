# SEO Implementation Deployment Checklist

## Pre-Deployment Verification

### 1. Sitemap Generation

- [ ] Sitemap generator script tested locally
  ```bash
  npm run sitemap
  ```

- [ ] Verify sitemap was created
  ```bash
  ls -la public/sitemap.xml
  ```

- [ ] Check sitemap format is valid
  ```bash
  head -20 public/sitemap.xml
  ```

- [ ] Verify URL entries have unique fragments
  ```bash
  grep "link-" public/sitemap.xml | head -5
  ```

### 2. Static Files

- [ ] robots.txt exists
  ```bash
  ls -la public/robots.txt
  ```

- [ ] Verify robots.txt syntax
  ```bash
  cat public/robots.txt
  ```

- [ ] Check Vite config includes publicDir
  ```bash
  grep "publicDir" vite.config.js
  ```

### 3. HTML Meta Tags

- [ ] Verify canonical link in index.html
  ```bash
  grep "canonical" index.html
  ```

- [ ] Check sitemap link reference
  ```bash
  grep "sitemap.xml" index.html
  ```

- [ ] Verify JSON-LD schema present
  ```bash
  grep "@context" index.html
  ```

- [ ] Check robots meta tag
  ```bash
  grep "robots" index.html
  ```

### 4. Package Configuration

- [ ] Verify sitemap script in package.json
  ```bash
  grep '"sitemap"' package.json
  ```

- [ ] Check prebuild hook configured
  ```bash
  grep '"prebuild"' package.json
  ```

### 5. Build Process

- [ ] Run full build to verify integration
  ```bash
  npm run build
  ```

- [ ] Check sitemap is generated during build
  ```bash
  tail -20 dist/sitemap.xml
  ```

- [ ] Verify robots.txt copied to dist
  ```bash
  ls -la dist/robots.txt
  ```

## Local Testing

### 1. Sitemap Validation

```bash
# Check XML is well-formed
node scripts/validate-sitemap.js
```

Expected output:
```
✓ XML structure is valid
✓ Total URLs: 91
✓ Valid URLs: 91/91
Validation Summary:
  Status: PASS
  Total URLs: 91
  Valid URLs: 91
  Issues: 0
  File size: 15.37 KB
```

### 2. Manual File Inspection

```bash
# View sitemap structure
less public/sitemap.xml

# Count total entries
grep -c "<url>" public/sitemap.xml

# Check for valid timestamps
grep "lastmod" public/sitemap.xml | head -5

# Verify priorities range 0.0-1.0
grep "priority" public/sitemap.xml | sort | uniq
```

### 3. Local Server Testing

```bash
# Start dev server
npm run dev

# In another terminal, test URLs
curl -I http://localhost:5174/robots.txt
curl http://localhost:5174/sitemap.xml | head -20
```

### 4. Browser Testing

In browser console:
```javascript
// Check sitemap link is present
document.querySelector('link[rel="sitemap"]').href
// Expected: "/sitemap.xml"

// Check canonical link
document.querySelector('link[rel="canonical"]').href
// Expected: "https://mediaeater.com/"

// Check schema markup
JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)
// Expected: WebSite schema with name, description, url
```

## Deployment Steps

### 1. Pre-Deploy Build

```bash
# Clean previous build
rm -rf dist/

# Run full build with sitemap generation
npm run build

# Verify outputs
ls -la dist/sitemap.xml
ls -la dist/robots.txt
```

### 2. Deploy to GitHub Pages

```bash
# Deploy will trigger prebuild hook
npm run deploy

# Wait for GitHub Actions to complete
# Check: https://github.com/yourusername/link-blog/deployments
```

### 3. Verify Production Deployment

```bash
# Test sitemap accessibility
curl -I https://mediaeater.com/sitemap.xml
# Expected: HTTP/1.1 200 OK

# Test robots.txt accessibility
curl -I https://mediaeater.com/robots.txt
# Expected: HTTP/1.1 200 OK

# Check sitemap content
curl https://mediaeater.com/sitemap.xml | head -20

# Verify sitemap is valid XML
curl https://mediaeater.com/sitemap.xml | xmllint --noout -
# Expected: validates successfully
```

## Search Engine Integration

### 1. Google Search Console

**Estimated Timeline**: 1-2 hours

- [ ] Go to https://search.google.com/search-console
- [ ] Click "Add property"
- [ ] Choose "URL prefix" and enter: `https://mediaeater.com`
- [ ] Verify ownership (DNS, file upload, meta tag, or Google Account)
- [ ] Navigate to Sitemaps section (left menu)
- [ ] Click "Add/test sitemap"
- [ ] Enter: `sitemap.xml` (or full URL)
- [ ] Click Submit

**Verification:**
```
Home → Sitemaps → https://mediaeater.com/sitemap.xml
Status: Success
URLs submitted: 91
URLs indexed: (will update after crawl)
```

**What to monitor:**
- Coverage report (Indexation → Coverage)
- Search results appearing for links
- Core Web Vitals in Experience section

### 2. Bing Webmaster Tools

**Estimated Timeline**: 1-2 hours

- [ ] Go to https://www.bing.com/webmasters
- [ ] Click "Add a site"
- [ ] Enter: `https://mediaeater.com`
- [ ] Verify ownership
- [ ] Go to Sitemaps section
- [ ] Click "Submit a sitemap"
- [ ] Enter: `https://mediaeater.com/sitemap.xml`
- [ ] Click Submit

**Verification:**
```
Sitemaps → Last submitted: [timestamp]
Status: Submitted successfully
```

### 3. Additional Search Engines

- [ ] **Yandex**: https://webmaster.yandex.com
- [ ] **Baidu**: https://zhanzhang.baidu.com (Chinese results)

## Post-Deployment Monitoring

### Daily (First Week)

- [ ] Check Google Search Console for crawl errors
- [ ] Monitor Core Web Vitals
- [ ] Check indexation progress
- [ ] Look for robots.txt issues

### Weekly (First Month)

- [ ] Review search queries in GSC
- [ ] Check clickthrough rates
- [ ] Monitor average position in search results
- [ ] Review any new crawl errors

### Monthly (Ongoing)

- [ ] Review search performance trends
- [ ] Check for broken links in sitemap
- [ ] Verify sitemap updates are working
- [ ] Monitor indexation coverage

## Troubleshooting Guide

### Issue: Sitemap Not Found (404)

**Symptoms**:
- Cannot access `/sitemap.xml`
- Google Search Console shows submission error

**Solutions**:
```bash
# 1. Check file exists in dist
ls -la dist/sitemap.xml

# 2. Verify Vite config has copyPublicDir
grep "copyPublicDir" vite.config.js

# 3. Rebuild and deploy
npm run build
npm run deploy

# 4. Check web server configuration
curl -v https://mediaeater.com/sitemap.xml
```

### Issue: Invalid XML in Sitemap

**Symptoms**:
- XML validators report errors
- Google Search Console shows parsing error

**Solutions**:
```bash
# 1. Validate locally
npm run sitemap
node scripts/validate-sitemap.js

# 2. Check for invalid characters
grep "[&<>]" public/sitemap.xml | grep -v "&lt;" | grep -v "&gt;" | grep -v "&amp;"

# 3. Regenerate
rm public/sitemap.xml
npm run sitemap
```

### Issue: Robots.txt Not Accessible

**Symptoms**:
- Cannot download robots.txt
- GSC shows robots.txt issues

**Solutions**:
```bash
# 1. Check file exists
ls -la public/robots.txt

# 2. Check permissions
chmod 644 public/robots.txt

# 3. Verify web server serves .txt files
curl -I https://mediaeater.com/robots.txt
```

### Issue: URLs Not Indexed

**Symptoms**:
- Sitemap submitted but indexed count stays 0
- Crawl errors in GSC

**Solutions**:
1. Wait 7-14 days (initial indexing period)
2. Check for crawl errors in GSC
3. Verify robots.txt isn't blocking crawlers
4. Check meta robots tags
5. Request indexing manually in GSC

```bash
# Fetch URL as Googlebot
curl -I -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
  https://mediaeater.com/
```

## Performance Optimization

### Monitor Search Performance

In Google Search Console:

1. **Performance Tab**
   - Click on your site
   - Go to Performance
   - View clicks, impressions, CTR, position

2. **Coverage Tab**
   - Monitor indexed vs. excluded pages
   - Check for errors or warnings

3. **Enhancements Tab**
   - Review Rich Results (if applicable)
   - Check for structured data issues

### Optimize Click-Through Rate

Improve meta descriptions and titles:

```bash
# Analyze top queries with low CTR
# In GSC → Performance, filter by CTR < 30%
# Update meta descriptions for these links
```

## Maintenance Tasks

### Weekly
```bash
# Verify sitemap generates without errors
npm run sitemap

# Check for new crawl errors
# Visit Google Search Console
```

### Monthly
```bash
# Validate sitemap integrity
npm run sitemap
node scripts/validate-sitemap.js

# Review search performance
# Check GSC reports
```

### Quarterly
```bash
# Full SEO audit
# 1. Check meta tags
# 2. Validate structured data
# 3. Review robots.txt rules
# 4. Test Core Web Vitals
```

## Rollback Procedure

If issues occur after deployment:

```bash
# 1. Revert to previous version
git log --oneline | head -5
git revert [commit-hash]

# 2. Force deploy to GitHub Pages
npm run deploy

# 3. Monitor for issues
# Check Google Search Console

# 4. Once stable, re-implement
git pull
npm run build
npm run deploy
```

## Success Metrics

Track these metrics to verify successful implementation:

1. **Sitemap Submission**: Successfully submitted to Google/Bing
2. **Indexation Rate**: 90%+ of URLs indexed within 30 days
3. **Search Visibility**: Links appearing in organic search results
4. **Traffic Increase**: Organic search traffic growing
5. **Crawl Health**: No crawl errors in GSC
6. **Core Web Vitals**: All green in GSC

## Files Modified Summary

```
Modified Files:
├── package.json
│   └── Added sitemap and prebuild scripts
├── vite.config.js
│   └── Added publicDir config
└── index.html
    └── Enhanced meta tags and schema

New Files Created:
├── scripts/generate-sitemap.js
├── scripts/validate-sitemap.js
├── public/sitemap.xml (generated)
├── public/robots.txt
├── src/components/SEOHead.jsx
├── SITEMAP_SETUP.md
├── SEO_QUICKSTART.md
└── DEPLOYMENT_CHECKLIST.md
```

## Quick Reference Commands

```bash
# Generate sitemap
npm run sitemap

# Validate sitemap
node scripts/validate-sitemap.js

# Full build with sitemap
npm run build

# Deploy to production
npm run deploy

# Test locally
npm run dev

# View sitemap
cat public/sitemap.xml

# Check robots.txt
cat public/robots.txt

# Count URLs in sitemap
grep -c "<url>" public/sitemap.xml
```

---

**Last Updated**: 2025-10-18
**Status**: Ready for Deployment
**Next Step**: Submit sitemap to Google Search Console
