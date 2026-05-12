# PostHog Engineering Impact Dashboard

An interactive dashboard analyzing the most impactful engineers in the PostHog repository based on 90 days of GitHub activity.

## 🎯 Impact Methodology

This dashboard goes beyond simple metrics like lines of code or commit count. Impact is measured through:

### Core Metrics:
- **PRs Merged (10pts each):** Successful contributions shipped to production
- **Reviews Given (15pts each):** Unblocking teammates and knowledge sharing
- **Review Depth (5pts):** Quality of feedback (thoughtful comments vs. rubber-stamping)
- **Cross-functional Reach (3pts):** Working across different areas of the codebase
- **Code Impact (log scale):** Scope of changes (log scale prevents LOC gaming)

### Why These Metrics?

1. **Reviews Weighted Highly:** Reviewing code is unblocking work and multiplying team velocity
2. **Review Depth Matters:** Distinguishes thoughtful reviewers from quick approvers
3. **Cross-functional Reach:** Engineers working across multiple areas spread knowledge
4. **Log Scale for Code:** Prevents gaming with massive LOC changes
5. **Collaboration Over Output:** Values helping others as much as individual contributions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd weave-oa-assessment

# Install dependencies
npm install

# (Optional) Set up GitHub token to avoid rate limits
cp .env.example .env.local
# Edit .env.local and add your GitHub token
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Build for Production

```bash
npm run build
npm start
```

## 📊 Data Source

- **Repository:** [PostHog/posthog](https://github.com/PostHog/posthog)
- **Time Period:** Last 90 days of merged pull requests
- **Data Points:** PRs, reviews, file changes, comments

## 🛠 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Data Fetching:** Octokit (GitHub REST API)
- **Visualization:** Recharts
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## 📁 Project Structure

```
weave-oa-assessment/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts       # GitHub API data fetching & analysis
│   └── page.tsx               # Dashboard UI
├── types/
│   └── index.ts               # TypeScript type definitions
├── SUBMISSION.md              # Submission tracker
└── README.md                  # This file
```

## 🎨 Features

- ✅ Real-time data fetching from GitHub API
- ✅ Composite impact scoring algorithm
- ✅ Interactive charts and visualizations
- ✅ Engineer cards with detailed metrics
- ✅ Transparent methodology explanation
- ✅ Responsive design
- ✅ Fast load times (<10s)

## 📝 Assignment Compliance

This dashboard was built for the Weave Engineering Impact Dashboard take-home assignment:

- ✅ Analyzes PostHog GitHub repository
- ✅ Defines meaningful "impact" metrics beyond LOC/commits
- ✅ Includes at least 90 days of data
- ✅ Shows top 5 most impactful engineers with reasoning
- ✅ Fits on a single page
- ✅ Interactive and easy to understand
- ✅ Shows calculation methodology

## 🔑 GitHub Token (Optional but Recommended)

Without a token, GitHub API is rate-limited to 60 requests/hour. With a token, you get 5,000 requests/hour.

Create a token at: https://github.com/settings/tokens

Required scope: `public_repo` (read access to public repositories)

Add to `.env.local`:
```
GITHUB_TOKEN=ghp_your_token_here
```

## 📦 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set `GITHUB_TOKEN` environment variable in Vercel dashboard.

## ⏱ Development Time

See `SUBMISSION.md` for actual time tracking.

## 📧 Contact

For questions about this submission, contact: jsemana054@gmail.com

---

Built for Weave | [Take-Home Assignment](https://www.notion.so/32dc2d11474d807886f6e49bf481f4fb?pvs=21)
