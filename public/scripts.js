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

let expiryTime = null;
let refreshing = false;

// -----------------------------
// Step 2: Start OAuth
// -----------------------------
function startOAuth() {
  window.open('/connect', 'pleo-oauth', 'width=600,height=700');
}

// -----------------------------
// Refresh token (auto/manual)
// -----------------------------
async function refreshToken() {
  if (refreshing) return;
  refreshing = true;
  try {
    const res = await fetch('/refresh');
    const tokenData = await res.json();
    if (tokenData.access_token) {
      updateTokenTable(tokenData);
      // Update expiry time for countdown
      expiryTime = tokenData.token_received_at
        ? tokenData.token_received_at + tokenData.expires_in * 1000
        : null;
    }
  } catch (err) {
    console.error('Failed to refresh token:', err);
  } finally {
    refreshing = false;
  }
}

// -----------------------------
// Update token table
// -----------------------------
function updateTokenTable(tokenData) {
  const rows = document.getElementById('tokensTable').rows;
  rows[1].cells[1].textContent = tokenData.access_token || '';
  rows[2].cells[1].textContent = tokenData.refresh_token || '';
  rows[3].cells[1].textContent = tokenData.expires_in || '';
  rows[4].cells[1].textContent = tokenData.scope || '';
}

// -----------------------------
// Load main OAuth & employee data
// -----------------------------
async function loadData() {
  try {
    const res = await fetch('/data/step3-token-response');
    const tokenData = await res.json();

    // No token yet → clear UI
    if (!tokenData || !tokenData.access_token) {
      resetTokenUI();
      return;
    }

    // Update token table
    updateTokenTable(tokenData);

    // Update expiry countdown
    if (tokenData.token_received_at && tokenData.expires_in) {
      expiryTime =
        tokenData.token_received_at + tokenData.expires_in * 1000;
    } else {
      expiryTime = null;
    }

  } catch (err) {
    console.error('Failed to load token data:', err);
  }
}

// -----------------------------
// Countdown + auto-refresh
// -----------------------------
function updateCountdown() {
  if (!expiryTime) return;
  const secs = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
  document.getElementById('expires').textContent = secs;

  // Auto-refresh 30 seconds before expiry
  if (secs <= 30 && !refreshing) {
    refreshToken();
  }
}

// -----------------------------
// Reset state
// -----------------------------
async function resetState() {
  try {
    await fetch('/reset', { method: 'POST' });
    location.reload();
  } catch (err) {
    console.error('Failed to reset state:', err);
  }
}

function resetStep1Table() {
  const ids = [
    'param-client-id',
    'param-redirect-uri',
    'param-scope',
    'param-state',
    'param-code-challenge'
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

// Call this on page load before polling files
resetStep1Table();

// -----------------------------
// Load all JSON files
// -----------------------------
const files = [
  'step2-pkce',
  'step2-redirect-request',
  'step2-redirect-response',
  'step3-token-request',
  'step3-token-response',
  'step4-api-request',
  'step4-api-response'
];

async function loadAllFiles() {
  for (const f of files) {
    try {
      const res = await fetch(`/data/${f}`);
      if (!res.ok) {
        if (f === 'step4-api-response') {
          renderEmployeesTable({ data: [] }); // clear table
        }
        continue;
      }
      const data = await res.json();
      document.getElementById(f).textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      console.error(`Failed to load ${f}:`, err);
      if (f === 'step4-api-response') renderEmployeesTable({ data: [] }); // clear table
    }
  }
}

async function loadStep2RedirectRequest() {
  try {
    const res = await fetch('/data/step2-redirect-request');
    const data = await res.json();
    document.getElementById('step2-redirect-request').textContent = JSON.stringify(data, null, 2);

    if (data.params && Object.values(data.params).some(v => v)) {
      document.getElementById('param-client-id').textContent = data.params.client_id || '';
      document.getElementById('param-redirect-uri').textContent = data.params.redirect_uri || '';
      document.getElementById('param-scope').textContent = data.params.scope || '';
      document.getElementById('param-state').textContent = data.params.state || '';
      document.getElementById('param-code-challenge').textContent = data.params.code_challenge || '';
    } else {
      resetStep1Table(); // Clear table if no data
    }
  } catch (err) {
    console.error('Failed to load Step 2 redirect request:', err);
    resetStep1Table();
  }
}

function renderEmployeesTable(apiResponse) {
  const table = document.getElementById('employeesTable');
  if (!table) return;

  // Clear all rows except header
  table.querySelectorAll('tr:not(:first-child)').forEach(row => row.remove());

  const employees = apiResponse?.data;

  if (!Array.isArray(employees)) {
    console.warn('Expected employees array at response.data', apiResponse);
    return;
  }

  employees.forEach(emp => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${emp.id}</td>
      <td>${emp.firstName} ${emp.lastName}</td>
      <td>${emp.email}</td>
    `;
    table.appendChild(row);
  });
}

// -----------------------------
// Call the API (corrected)
// -----------------------------
async function callEmployees() {
  try {
    const res = await fetch('/call-employees', { method: 'POST' });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server error: ${text}`);
    }

    const data = await res.json();

    document.getElementById('step4-api-response').textContent =
      JSON.stringify(data, null, 2);

    renderEmployeesTable(data);

  } catch (err) {
    console.error(err);
    alert('Unexpected error: ' + err.message);
  }
}

// -----------------------------
// Token UI helpers
// -----------------------------
function updateTokenUI(tokenData) {
  if (!tokenData || !tokenData.access_token || !tokenData.token_received_at) {
    resetTokenUI();
    return;
  }

  const expiresIn = tokenData.expires_in;
  const receivedAt = tokenData.token_received_at;
  expiryTime = receivedAt + expiresIn * 1000;
}

function resetTokenUI() {
  expiryTime = null;

  document.getElementById('expires').textContent = '--';

  const table = document.getElementById('tokensTable');
  if (table) {
    table.querySelectorAll('tr td:nth-child(2)').forEach(td => {
      td.textContent = '';
    });
  }
}

// -----------------------------
// Poll Step 3 token
// -----------------------------
async function pollStep3() {
  const res = await fetch('/data/step3-token-response');
  const data = await res.json();

  if (!data || Object.keys(data).length === 0) {
    resetTokenUI();
    return;
  }

  updateTokenUI(data);
}


async function loadStep3Status() {
  try {
    const res = await fetch('/data/step3-status');
    const data = await res.json();
    document.getElementById('step3-status').textContent = data.status || 'Not started';
  } catch (err) {
    console.error('Failed to load Step 3 status:', err);
  }
}

// Poll Step 3 status every 2 seconds
setInterval(loadStep3Status, 2000);
loadStep3Status(); // Initial load

// -----------------------------
// Poll intervals
// -----------------------------
setInterval(updateCountdown, 1000);      // Countdown display & auto-refresh
setInterval(loadData, 2000);            // Poll token & employee data
setInterval(loadAllFiles, 2000);        // Poll all JSON files
setInterval(loadStep2RedirectRequest, 2000); // Poll Step 2 redirect params

// Initial load
loadData();
loadAllFiles();
loadStep2RedirectRequest();