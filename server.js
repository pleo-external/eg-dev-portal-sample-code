/**
 * Pleo Educational License
 *
 * Copyright (c) 2026 Pleo ApS
 *
 * This file is provided for **educational and documentation purposes only**.
 * You may view, copy, and run it for personal or internal learning.
 * 
 * **Do NOT use in production.**
 * Pleo provides no warranty or support for these examples.
 *
 * For official API usage and production guidance, see:
 * https://developers.pleo.io/
 */
/**
 * Pleo OAuth 2.0 Prototype Server
 *
 * Implements:
 * - Step 2: Direct users to the Authorisation Endpoint
 * - Step 3: Handle Redirects and Exchange an Authorization Code
 * - Step 4: Call Pleo APIs Using an Access Token
 * - Step 5: Refresh Tokens
 *
 * State is persisted to disk so the HTML dashboard
 * can poll and remain visible throughout the OAuth flow.
 */
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// -----------------------------
// File paths
// -----------------------------
const FILES = {
  step2Pkce: path.join(__dirname, 'oauth-step2-pkce.json'),
  step2RedirectRequest: path.join(__dirname, 'oauth-step2-redirect-request.json'),
  step2RedirectResponse: path.join(__dirname, 'oauth-step2-redirect-response.json'),
  step3TokenReq: path.join(__dirname, 'oauth-step3-token-exchange-request.json'),
  step3TokenRes: path.join(__dirname, 'oauth-step3-token-exchange-response.json'),
  step4ApiReq: path.join(__dirname, 'oauth-step4-call-pleo-api.json'),
  step4ApiRes: path.join(__dirname, 'oauth-step4-pleo-api-response.json'),
  step3Status: path.join(__dirname, 'step3-status.json'),
};

// -----------------------------
// Clear all files on startup
// -----------------------------
Object.values(FILES).forEach(file => {
  if (fs.existsSync(file)) fs.unlinkSync(file);
});
console.log('All OAuth files cleared on startup');

// Initialize Step 2 redirect request as empty so frontend Step 1 table is cleared
writeJSON(FILES.step2RedirectRequest, {
  params: {
    client_id: '',
    redirect_uri: '',
    scope: '',
    state: '',
    code_challenge: ''
  },
  redirect_url: ''
});

// Also clear employees table
writeJSON(FILES.step4ApiRes, { data: [] });
writeJSON(FILES.step4ApiReq, {});

// -----------------------------
// Helpers
// -----------------------------
function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath));
}

// Serve static dashboard
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// -----------------------------
// Step 2: Generate PKCE & Redirect to Pleo
// -----------------------------
app.get('/connect', (req, res) => {
  const codeVerifier = crypto.randomBytes(64).toString('hex');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');

  // PKCE generated
  writeJSON(FILES.step2Pkce, { codeVerifier, codeChallenge, state, generated_at: new Date().toISOString() });

  // Redirect request
  const params = {
    response_type: 'code',
    client_id: process.env.CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URI,
    scope: process.env.SCOPE,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  };
  const redirectUrl = `https://auth.staging.pleo.io/oauth/authorize?${new URLSearchParams(params)}`;
  writeJSON(FILES.step2RedirectRequest, { params, redirect_url: redirectUrl });

  // Prepare empty redirect response for later
  writeJSON(FILES.step2RedirectResponse, {});

  res.redirect(redirectUrl);
});

app.get('/data/step3-status', (req, res) => {
  if (!fs.existsSync(FILES.step3Status)) return res.json({ status: 'Not started' });
  res.json(readJSON(FILES.step3Status));
});

// -----------------------------
// Step 3: OAuth callback & token exchange
// -----------------------------
app.get('/oauth/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const step2Data = readJSON(FILES.step2Pkce);

  // Save redirect response
  writeJSON(FILES.step2RedirectResponse, error ? { error, error_description } : { code, state });

  if (error || !code || state !== step2Data.state) {
    writeJSON(FILES.step3Status, { status: 'OAuth failed or invalid state' }); // ← update status
    return res.send('<h3>OAuth failed or invalid state</h3>');
  }

  // State verified
  writeJSON(FILES.step3Status, { status: 'State verified. Exchanging code for tokens...' });

  try {
    const payload = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.REDIRECT_URI,
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code_verifier: step2Data.codeVerifier,
    });
    writeJSON(FILES.step3TokenReq, Object.fromEntries(payload.entries()));

    const tokenRes = await axios.post(
      'https://auth.staging.pleo.io/oauth/token',
      payload,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const tokenData = {
      ...tokenRes.data,
      token_received_at: Date.now()
    };
    writeJSON(FILES.step3TokenRes, tokenData);

    // ✅ Token exchange successful
    writeJSON(FILES.step3Status, { status: 'State verified. Exchanging code for tokens... Token exchange successful' });

    res.send('<h3>OAuth Completed</h3><p>You can close this window.</p><script>window.close()</script>');

  } catch (err) {
    console.error(err.response?.data || err.message);
    writeJSON(FILES.step3TokenRes, { error: err.response?.data || err.message });
    writeJSON(FILES.step3Status, { status: 'Token exchange failed' });
    res.send('<h3>Token exchange or API call failed</h3>');
  }
});
// -----------------------------
// Step 4 - Call Employees API using latest token
// -----------------------------

app.post('/call-employees', async (req, res) => {
  try {
    const tokenData = readJSON(FILES.step3TokenRes);

    if (!tokenData.access_token) {
      return res.status(400).json({ error: 'No access token available' });
    }

    const apiReq = {
      url: 'https://external.staging.pleo.io/v2/employees',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    };

    writeJSON(FILES.step4ApiReq, apiReq);

    const apiRes = await axios.get(apiReq.url, { headers: apiReq.headers });
    writeJSON(FILES.step4ApiRes, apiRes.data);

    res.json(apiRes.data);

  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// -----------------------------
// Step 5: Refresh tokens
// -----------------------------
app.get('/refresh', async (req, res) => {
  try {
    const tokenData = readJSON(FILES.step3TokenRes);
    if (!tokenData.refresh_token) {
      return res.status(400).json({ error: 'No refresh token available' });
    }

    // Prepare token refresh request
    const payload = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenData.refresh_token,
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
    });

    const refreshRes = await axios.post(
      'https://auth.staging.pleo.io/oauth/token',
      payload,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    // Update token_received_at
    const newTokenData = {
      ...refreshRes.data,
      token_received_at: Date.now(),
    };

    // Persist updated token
    writeJSON(FILES.step3TokenRes, newTokenData);

    // Return updated token JSON to frontend
    res.json(newTokenData);

  } catch (err) {
    console.error('Token refresh failed:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// -----------------------------
// Dashboard JSON endpoints
// -----------------------------
app.get('/data/:file', (req, res) => {
  const fileMap = {
    'step2-pkce': FILES.step2Pkce,
    'step2-redirect-request': FILES.step2RedirectRequest,
    'step2-redirect-response': FILES.step2RedirectResponse,
    'step3-token-request': FILES.step3TokenReq,
    'step3-token-response': FILES.step3TokenRes,
    'step4-api-request': FILES.step4ApiReq,
    'step4-api-response': FILES.step4ApiRes,
  };
  const file = fileMap[req.params.file];
  if (!file) return res.status(404).send({ error: 'File not found' });
  res.json(readJSON(file));
});

// -----------------------------
// Reset all files
// -----------------------------
app.post('/reset', (req, res) => {
  Object.values(FILES).forEach(file => { if (fs.existsSync(file)) fs.unlinkSync(file); });
  res.send({ status: 'All OAuth files reset' });
});

// -----------------------------
// Start server
// -----------------------------
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));