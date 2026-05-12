# PostHog Engineering Impact Dashboard

An interactive dashboard analyzing the most impactful engineers in the PostHog repository based on 90 days of GitHub activity.

## 🎯 Impact Methodology

This dashboard goes beyond simple metrics like lines of code or commit count. Impact is measured through:

### Core Metrics (Enhanced Collaboration Model):

**Priority Ranking: Most → Least Impact**

1. **Reviews Given (20pts each)** 🥇
   - **Why Highest:** One review unblocks another engineer (multiplier effect)
   - **Impact:** Reviewing 20 PRs = potentially unblocking 20 features
   - **Philosophy:** Team velocity > individual output

2. **Review Depth (10pts)** 🥈
   - **Why Second:** Quality > quantity (prevents rubber-stamping)
   - **Calculation:** Substantial comments (>50 chars) / total reviews
   - **Impact:** Thoughtful reviews teach and catch subtle bugs

3. **PRs Merged (12pts each)** 🥉
   - **Why Third:** Shipping is essential but not a team multiplier
   - **Philosophy:** Great engineers ship AND help others ship
   - **Balance:** Valued highly (12pts) but not above collaboration

4. **Cross-functional Reach (5pts per area)**
   - **Why Matters:** Generalists unblock themselves, reduce team bottlenecks
   - **Calculation:** Number of unique top-level directories touched
   - **Impact:** Bus factor protection, knowledge spread

5. **Code Impact (3pts per file, capped at 20)**
   - **Why Lowest:** Scope matters but easy to game
   - **Anti-Gaming:** Capped to prevent LOC inflation
   - **Philosophy:** Small, focused PRs often > massive changes

### Scoring Philosophy

> **Impact = Leverage × Quality**
>
> We prioritize actions that multiply team output over individual contributions.
> A single thoughtful review can prevent bugs, teach patterns, and unblock
> critical features — far exceeding the impact of solo work.

**Weight Rationale:**
- **Reviews (20pts):** Highest leverage — unblocks entire team
- **Review Depth (10pts):** Prevents gaming with low-effort approvals
- **PRs (12pts):** Essential but linear impact (helps your work only)
- **Cross-functional (5pts):** Generalists enable flexibility
- **Code Impact (3pts):** Scope matters, but capped to prevent abuse

**Example Calculation:**

```
Engineer with 5 PRs, 9 reviews (0.78 depth), 4 areas, 2 avg files/PR:
- Reviews:         9 × 20 = 180 pts (66% of score)
- Review Depth:  0.78 × 10 = 8 pts (3%)
- PRs:             5 × 12 = 60 pts (22%)
- Cross-functional: 4 × 5 = 20 pts (7%)
- Code Impact:     2 × 3 = 6 pts (2%)
Total: 274 points
```

This engineer is **review-focused** (66% from reviews) — a team multiplier!

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
