# Cybersecurity + Website Intelligence + Analytics SaaS Platform

A full-stack SaaS platform designed to analyze websites through automated scanning, performance analysis, security inspection, and traffic intelligence gathering.

The platform focuses on combining:

* Website security analysis
* Performance analytics
* Third-party dependency inspection
* SEO structure analysis
* Marketing tracker detection
* Website intelligence visualization

---

## Current Project Status

### Current MVP Features

### Backend Scanner Engine

* Website scanning using Playwright
* Metadata extraction
* Performance timing analysis
* Image and link counting
* Security header inspection
* HTTPS detection
* Initial scoring engine

### Frontend

* React + Vite setup
* Cybersecurity-inspired UI foundation
* Animated landing page
* Search input components
* Dashboard layout groundwork

### Analytics & Scoring

* Performance scoring
* SEO scoring
* Security scoring
* Basic risk evaluation

---

## Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS
* Framer Motion

### Backend

* Node.js
* Express.js
* Playwright
* Axios
* dotenv

### Planned Database

* MongoDB Atlas

### Planned Deployment

* Vercel (Frontend)
* Render (Backend)

---

## Current Architecture

### Frontend Structure

```text
ScannerFrontend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── lib/
│   └── main.jsx
```

---

### Backend Structure

```text
ScannerBackend/
├── src/
│   ├── routes/
│   ├── services/
│   └── app.js
├── server.js
```

---

## Current Scanner Capabilities

The scanner currently analyzes:

* Website title
* Meta description
* Page load time
* Image count
* Link count
* H1 structure
* HTTPS usage
* Security headers

### Example Response

```json
{
  "title": "Example Domain",
  "description": "Example description",
  "loadTime": 842,
  "imageCount": 12,
  "linkCount": 18,
  "headers": {
    "h1": "Example Domain"
  },
  "securityHeaders": {
    "csp": null,
    "xFrame": "SAMEORIGIN"
  },
  "usesHttps": true
}
```

---

## Security Analysis

Current security analysis includes:

* Content-Security-Policy detection
* X-Frame-Options detection
* HTTPS enforcement checks

### Planned Future Upgrades

* SSL certificate analysis
* Cookie security auditing
* CVE vulnerability matching
* Third-party dependency risk analysis

---

## Planned Features

### Traffic Intelligence

* Tracker detection
* Third-party request analysis
* Marketing stack detection
* Referral mapping

### SaaS Features

* User authentication
* Scan history
* Saved reports
* Dashboard analytics
* Scheduled scans

### Advanced Analytics

* AI-generated recommendations
* SEO auditing
* Historical comparison
* Risk trend analysis

---

## Development Roadmap

### Phase 1 — MVP Scanner

* Backend scraper engine
* Initial frontend
* Scoring system
* Security header analysis

### Phase 2 — Frontend Integration

* Live dashboard
* Dynamic scan results
* Visualization components

### Phase 3 — SaaS Platform

* Authentication
* Database integration
* User dashboards
* Report storage

### Phase 4 — Advanced Intelligence

* Threat analysis
* AI recommendations
* Traffic intelligence
* SEO engine

---

## Getting Started

### Clone Repository

```bash
git clone <repository-url>
cd <project-folder>
```

---

### Backend Setup

```bash
cd ScannerBackend
npm install
node server.js
```

Backend runs on:

```text
http://localhost:3000
```

---

### Frontend Setup

```bash
cd ScannerFrontend
npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

## Environment Variables

Create a `.env` file inside `ScannerBackend`:

```env
PORT=3000
```

---

## Important Notes

* This platform currently performs passive website analysis only.
* No intrusive penetration testing is performed.
* The project is actively under development.

---

## Long-Term Vision

The platform aims to evolve into a unified solution for:

* Website security analysis
* Performance monitoring
* SEO intelligence
* Traffic analytics
* Third-party dependency analysis
* Automated website auditing

---

## Author

Built as a personal full-stack SaaS project focused on:

* Cybersecurity concepts
* Analytics systems
* Browser automation
* Backend engineering
* Scalable SaaS architecture
