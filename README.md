# OAuth 2.0 Example – Pleo Educational Prototype

![Pleo Educational License](https://img.shields.io/badge/license-Pleo--Educational-blue)
![Last Commit](https://img.shields.io/github/last-commit/celeste-groenewald/dev-portal-doc-examples)

Version: 1.0
---

## Overview

This folder contains a **working OAuth 2.0 prototype** demonstrating Pleo’s OAuth 2.0 flow.  

> ⚠️ **Educational Purpose Only:**  
> These examples are **not production-ready**. They are meant for learning and documentation purposes.  
> Official documentation: [Pleo Developers](https://developers.pleo.io/)

The example demonstrates:

1. Step 2: Generating PKCE and redirecting to Pleo’s Authorization Endpoint  
2. Step 3: Handling the OAuth callback and exchanging the authorization code for tokens  
3. Step 4: Calling Pleo APIs using the access token  
4. Step 5: Refreshing tokens  
5. Logging each request and response for visibility  

All request/response data is stored in local JSON files for inspection.

---

## Folder Structure

```bash
oauth/
├─ public/ # Frontend dashboard to visualize OAuth flow
├─ server.js # Node.js server handling OAuth steps
├─ package.json # Project metadata and dependencies
├─ .env.example # Example environment variables (do not commit real secrets)
├─ README.md # This file
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+  
- NPM  
- Git  

> ⚠️ You will need a Pleo sandbox or staging account with a registered OAuth app.  

---

## Setup Instructions

1. **Clone the repo** (or ensure you have the `oauth` folder locally)  

```bash
git clone git@github.com:celeste-groenewald/dev-portal-doc-examples.git
cd dev-portal-doc-examples/oauth
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Copy `.env.example` to `.env` and fill in your values:

```bash
CLIENT_ID=<your-client-id>
CLIENT_SECRET=<your-client-secret>
REDIRECT_URI=http://localhost:3000/oauth/callback
SCOPE=employees.read
PORT=3000
```

> ⚠️ Do not commit .env; it contains sensitive information.

4. **Run the server**

```bash
node server.js
```

5. **Open the dashboard**:

Open [http://localhost:3000](http://localhost:3000) in your browser.  
Click **“Connect to Pleo”** to start the OAuth flow.

---

## Viewing the Flow

> ⚠️ **Educational Use Only:**  
> The JSON files generated in this example contain sensitive information such as PKCE values, client secrets, and access/refresh tokens. They are intended for learning and inspection **only**.  

The app will generate the following files locally:

- `oauth-step2-pkce.json` → Server-generated PKCE values  
- `oauth-step2-redirect-request.json` → Example redirect parameters sent to Pleo  
- `oauth-step2-redirect-response.json` → Pleo’s response (code + state or error)  
- `oauth-step3-token-exchange-request.json` → Token exchange request  
- `oauth-step3-token-exchange-response.json` → Token exchange response  
- `oauth-step4-call-pleo-api.json` → API request with access token  
- `oauth-step4-pleo-api-response.json` → API response (employee data)  

### Important Notes for Security

- **Do not keep these files longer than necessary.**  
  Clicking **“Reset OAuth State”** in the dashboard or restarting the server will delete them automatically.  
- **In production environments:**  
  - These files would **not exist** at all.  
  - Sensitive data should **never be stored in plaintext** on disk.  
  - Use **secure, centralized token storage** (e.g., encrypted database, vault system, or token management service).  
  - Logging should avoid including secrets; only record request events or metadata for auditing/debugging.  
- Temporary values like access tokens can live in memory only while needed and should be discarded immediately after use.  

This approach ensures you can **inspect the OAuth lifecycle safely** in a learning environment while clearly showing how production security differs.

---

## Notes

- The dashboard **auto-refreshes tokens** 30 seconds before expiration to demonstrate Step 5.  
- All JSON files are **reset when the server starts** (`node server.js`) or when you click **“Reset OAuth State”**.  
- **Educational Prototype Only:**  
  - These files contain sensitive information and are **never intended for production use**.  
  - In a production environment:
    - You would **not store sensitive OAuth data in local files**.  
    - Access/refresh tokens and other secrets should be stored **securely** in a centralized token management system or encrypted database.  
    - Logs should **avoid sensitive data**, recording only metadata, request events, or audit information.  
    - Temporary credentials should **only live in memory** while needed and then be discarded.  
- This repo is intended to help you **understand the OAuth 2.0 flow** and inspect how requests and responses interact with Pleo APIs.  

> ⚠️ Always treat client secrets, PKCE values, and tokens as sensitive.  
> Never commit `.env` files or production secrets to a public repo.
---

## License

**Pleo Educational License** – see [LICENSE](../LICENSE) in the repo root.  
This folder and its content are for **educational and documentation purposes only**.
