import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { subDays } from 'date-fns';
import type { EngineerImpact, DashboardData } from '@/types';

// Initialize Octokit (no auth token needed for public repos, but rate-limited)
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // optional, but recommended
});

const REPO_OWNER = 'PostHog';
const REPO_NAME = 'posthog';
const DAYS_TO_ANALYZE = 90;

export async function GET() {
  try {
    // grab the date 90 days ago
    const since = subDays(new Date(), DAYS_TO_ANALYZE).toISOString();

    console.log(`Fetching data since ${since}...`);

    // Fetch merged PRs from last 90 days
    const { data: pullRequests } = await octokit.rest.pulls.list({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      per_page: 100, // Adjust based on repo activity
    });

    // Filter to only merged PRs within timeframe
    const mergedPRs = pullRequests.filter(
      (pr) => pr.merged_at && new Date(pr.merged_at) >= new Date(since)
    );

    console.log(`Found ${mergedPRs.length} merged PRs in last ${DAYS_TO_ANALYZE} days`);

    // Aggregate engineer data
    const engineerMap = new Map<string, any>();

    // Process PRs
    for (const pr of mergedPRs) {
      // get the author of the PR
      const author = pr.user?.login;
      // if the author is not found, continue
      if (!author) continue;

      // if the author is not in the engineerMap, add them
      if (!engineerMap.has(author)) {
        engineerMap.set(author, {
          username: author,
          avatar_url: pr.user?.avatar_url || '',
          prsAuthored: 0,
          prsMerged: 0,
          reviewsGiven: 0,
          reviewComments: 0,
          directories: new Set<string>(),
          filesChanged: 0,
        });
      }

      // get the engineer from the engineerMap
      const engineer = engineerMap.get(author);
      engineer.prsAuthored++;
      engineer.prsMerged++;

      // Fetch files changed to calculate cross-functional reach
      try {
        const { data: files } = await octokit.rest.pulls.listFiles({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          pull_number: pr.number,
          per_page: 100,
        });

        engineer.filesChanged += files.length;
        files.forEach((file) => {
          const dir = file.filename.split('/')[0];
          engineer.directories.add(dir);
        });
      } catch (error) {
        console.error(`Error fetching files for PR #${pr.number}:`, error);
      }

      // Fetch reviews on this PR to track who reviewed it
      try {
        const { data: reviews } = await octokit.rest.pulls.listReviews({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          pull_number: pr.number,
        });

        reviews.forEach((review) => {
          const reviewer = review.user?.login;
          if (!reviewer || reviewer === author) return;

          if (!engineerMap.has(reviewer)) {
            engineerMap.set(reviewer, {
              username: reviewer,
              avatar_url: review.user?.avatar_url || '',
              prsAuthored: 0,
              prsMerged: 0,
              reviewsGiven: 0,
              reviewComments: 0,
              directories: new Set<string>(),
              filesChanged: 0,
            });
          }

          const reviewerData = engineerMap.get(reviewer);
          reviewerData.reviewsGiven++;
          if (review.body) {
            reviewerData.reviewComments += review.body.length > 50 ? 1 : 0; // Substantial comments
          }
        });
      } catch (error) {
        console.error(`Error fetching reviews for PR #${pr.number}:`, error);
      }
    }

    // Calculate impact scores
    const engineers: EngineerImpact[] = Array.from(engineerMap.values()).map((eng) => {
      // Impact scoring logic
      const reviewDepth = eng.reviewsGiven > 0 ? eng.reviewComments / eng.reviewsGiven : 0;
      const crossFunctionalReach = eng.directories.size;
      const unblockingScore = eng.reviewsGiven * 2; // Reviews help unblock others
      const qualityScore = eng.prsMerged * 10; // Assume merged PRs = good quality
      const avgFilesPerPR = eng.prsMerged > 0 ? eng.filesChanged / eng.prsMerged : 0;

      // Composite impact score (weighted)
      const impactScore =
        eng.prsMerged * 10 + // Base contribution
        eng.reviewsGiven * 15 + // High value on helping others
        reviewDepth * 5 + // Quality of reviews
        crossFunctionalReach * 3 + // Breadth of knowledge
        Math.min(avgFilesPerPR, 20) * 2; // Scope of changes (capped to prevent gaming)

      const reasoning: string[] = [];
      if (eng.prsMerged > 10) reasoning.push(`Shipped ${eng.prsMerged} PRs`);
      if (eng.reviewsGiven > 20) reasoning.push(`Reviewed ${eng.reviewsGiven} PRs, unblocking teammates`);
      if (crossFunctionalReach > 5) reasoning.push(`Worked across ${crossFunctionalReach} different areas`);
      if (reviewDepth > 0.5) reasoning.push(`Thoughtful reviews with detailed feedback`);
      if (avgFilesPerPR > 10) reasoning.push(`Substantial changes averaging ${Math.round(avgFilesPerPR)} files per PR`);

      return {
        username: eng.username,
        avatar_url: eng.avatar_url,
        impactScore: Math.round(impactScore),
        metrics: {
          prsAuthored: eng.prsAuthored,
          prsMerged: eng.prsMerged,
          reviewsGiven: eng.reviewsGiven,
          reviewDepth: Math.round(reviewDepth * 100) / 100,
          codeImpact: Math.round(avgFilesPerPR),
          crossFunctionalReach,
          unblockingScore,
          qualityScore,
        },
        reasoning,
      };
    });

    // Sort by impact score and take top 5
    const topEngineers = engineers
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 5);

    const response: DashboardData = {
      engineers: topEngineers,
      metadata: {
        dataFrom: since,
        dataTo: new Date().toISOString(),
        totalPRs: mergedPRs.length,
        totalReviews: Array.from(engineerMap.values()).reduce(
          (sum, eng) => sum + eng.reviewsGiven,
          0
        ),
        analysisTimestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error analyzing GitHub data:', error);
    return NextResponse.json(
      { error: 'Failed to analyze GitHub data', details: String(error) },
      { status: 500 }
    );
  }
}
