const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

/**
 * Cryptographic utilities for ActivityPub
 * Handles RSA keypair generation and HTTP signature signing/verification
 */

const KEYS_PATH = path.join(__dirname, '..', 'data', 'activitypub', 'keys.json');

/**
 * Generate RSA keypair for signing ActivityPub activities
 * @returns {Promise<{privateKey: string, publicKey: string}>}
 */
async function generateKeyPair() {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    }, (err, publicKey, privateKey) => {
      if (err) reject(err);
      else resolve({ privateKey, publicKey });
    });
  });
}

/**
 * Load or generate keypair
 * @returns {Promise<{privateKey: string, publicKey: string}>}
 */
async function getKeyPair() {
  try {
    // Try to load existing keys
    const keysData = await fs.readFile(KEYS_PATH, 'utf8');
    const keys = JSON.parse(keysData);

    if (keys.privateKey && keys.publicKey) {
      return {
        privateKey: keys.privateKey,
        publicKey: keys.publicKey
      };
    }
  } catch (error) {
    // Keys don't exist, generate new ones
    console.log('Generating new RSA keypair for ActivityPub...');
  }

  // Generate new keypair
  const keys = await generateKeyPair();

  // Save keys
  await saveKeyPair(keys);

  return keys;
}

/**
 * Save keypair to disk
 * @param {{privateKey: string, publicKey: string}} keys
 */
async function saveKeyPair(keys) {
  const dir = path.dirname(KEYS_PATH);
  await fs.mkdir(dir, { recursive: true });

  const data = {
    privateKey: keys.privateKey,
    publicKey: keys.publicKey,
    createdAt: new Date().toISOString()
  };

  await fs.writeFile(KEYS_PATH, JSON.stringify(data, null, 2));
  console.log('Keypair saved to', KEYS_PATH);
}

/**
 * Create HTTP signature for a request
 * Based on https://datatracker.ietf.org/doc/html/draft-cavage-http-signatures
 *
 * @param {string} privateKey - PEM encoded private key
 * @param {string} keyId - URL of the public key
 * @param {Object} request - Request details
 * @param {string} request.method - HTTP method (e.g., 'POST')
 * @param {string} request.url - Full URL
 * @param {Object} request.headers - Request headers
 * @param {string} [request.body] - Request body (for POST/PUT)
 * @returns {string} Signature header value
 */
function createSignature(privateKey, keyId, request) {
  const url = new URL(request.url);
  const requestTarget = `${request.method.toLowerCase()} ${url.pathname}${url.search}`;

  // Headers to sign
  const headersToSign = ['(request-target)', 'host', 'date'];

  // Add digest if body present
  let digest = '';
  if (request.body) {
    const hash = crypto.createHash('sha256');
    hash.update(request.body);
    digest = `SHA-256=${hash.digest('base64')}`;
    headersToSign.push('digest');
  }

  // Build signing string
  const signingString = headersToSign.map(header => {
    if (header === '(request-target)') {
      return `(request-target): ${requestTarget}`;
    } else if (header === 'host') {
      return `host: ${url.host}`;
    } else if (header === 'date') {
      return `date: ${request.headers.date}`;
    } else if (header === 'digest') {
      return `digest: ${digest}`;
    }
    return `${header}: ${request.headers[header]}`;
  }).join('\n');

  // Sign
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingString);
  const signature = signer.sign(privateKey, 'base64');

  // Return signature header
  return `keyId="${keyId}",headers="${headersToSign.join(' ')}",signature="${signature}"`;
}

/**
 * Verify HTTP signature
 * @param {string} publicKeyPem - PEM encoded public key
 * @param {Object} request - Request details
 * @param {string} signatureHeader - Signature header value
 * @returns {boolean} True if signature is valid
 */
function verifySignature(publicKeyPem, request, signatureHeader) {
  try {
    // Parse signature header
    const params = {};
    signatureHeader.split(',').forEach(part => {
      const [key, ...valueParts] = part.trim().split('=');
      const value = valueParts.join('=').replace(/"/g, '');
      params[key] = value;
    });

    const { keyId, headers, signature } = params;
    if (!keyId || !headers || !signature) {
      return false;
    }

    const headersList = headers.split(' ');
    const url = new URL(request.url, `https://${request.headers.host}`);
    const requestTarget = `${request.method.toLowerCase()} ${url.pathname}${url.search}`;

    // Rebuild signing string
    const signingString = headersList.map(header => {
      if (header === '(request-target)') {
        return `(request-target): ${requestTarget}`;
      } else if (header === 'host') {
        return `host: ${request.headers.host}`;
      } else if (header === 'date') {
        return `date: ${request.headers.date}`;
      } else if (header === 'digest') {
        return `digest: ${request.headers.digest}`;
      }
      return `${header}: ${request.headers[header]}`;
    }).join('\n');

    // Verify signature
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(signingString);
    return verifier.verify(publicKeyPem, signature, 'base64');
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Create digest header for request body
 * @param {string|Object} body - Request body
 * @returns {string} Digest header value
 */
function createDigest(body) {
  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  const hash = crypto.createHash('sha256');
  hash.update(bodyString);
  return `SHA-256=${hash.digest('base64')}`;
}

module.exports = {
  generateKeyPair,
  getKeyPair,
  saveKeyPair,
  createSignature,
  verifySignature,
  createDigest
};
