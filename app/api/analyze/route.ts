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
const BATCH_SIZE = 10; // Process 10 PRs at a time to respect rate limits

function formatElapsedMs(sinceMark: number): string {
  const elapsed = performance.now() - sinceMark;
  return `${Math.round(elapsed)}ms (${(elapsed / 1000).toFixed(2)}s)`;
}

/** Treat missing username as bot; match GitHub bot naming and account type */
function isBot(username: string, userType?: string): boolean {
  if (!username) return true;

  const lowerName = username.toLowerCase();
  return (
    lowerName.includes('bot') ||
    lowerName.includes('[bot]') ||
    userType === 'Bot'
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeBots = searchParams.get('includeBots') === 'true';

  try {
    const analyzeT0 = performance.now();

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

    console.log('\n🔍 Sample of PR authors BEFORE filtering:');
    mergedPRs.slice(0, 10).forEach((pr) => {
      const username = pr.user?.login || 'unknown';
      const type = pr.user?.type || 'unknown';
      const botFlag = isBot(pr.user?.login || '', pr.user?.type) ? ' 🤖' : '';
      console.log(`  - ${username}${botFlag} (type: ${type})`);
    });

    const filteredPRs = includeBots
      ? mergedPRs
      : mergedPRs.filter((pr) => !isBot(pr.user?.login || '', pr.user?.type));

    // Detailed bot filtering log
    if (!includeBots) {
      const botsFiltered = mergedPRs.filter((pr) =>
        isBot(pr.user?.login || '', pr.user?.type)
      );

      const uniqueBots = [...new Set(botsFiltered.map((pr) => pr.user?.login))];
      console.log(`\n🤖 Bot Filtering Results:`);
      console.log(`  Total PRs before filter: ${mergedPRs.length}`);
      console.log(`  Bot PRs detected: ${botsFiltered.length}`);
      console.log(`  Unique bot accounts: ${uniqueBots.length}`);
      console.log(`  PRs after filter: ${filteredPRs.length}`);
      console.log(
        `  Sample bots filtered: ${uniqueBots.slice(0, 5).join(', ')}${uniqueBots.length > 5 ? '...' : ''}`
      );
    } else {
      console.log(`\n✅ Including all PRs (bots enabled) - ${mergedPRs.length} total`);
    }

    console.log(`⏱️ PR list fetch: ${formatElapsedMs(analyzeT0)}`);

    // Aggregate engineer data
    const engineerMap = new Map<string, any>();

    const batchesT0 = performance.now();

    // Process PRs in batches for better performance
    const batches = [];
    for (let i = 0; i < filteredPRs.length; i += BATCH_SIZE) {
      batches.push(filteredPRs.slice(i, i + BATCH_SIZE));
    }

    console.log(`Processing ${filteredPRs.length} PRs in ${batches.length} batches...`);

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (pr) => {
          const author = pr.user?.login;
          if (!author) return;

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

          const engineer = engineerMap.get(author);
          engineer.prsAuthored++;
          engineer.prsMerged++;

          const [filesResult, reviewsResult] = await Promise.allSettled([
            octokit.rest.pulls.listFiles({
              owner: REPO_OWNER,
              repo: REPO_NAME,
              pull_number: pr.number,
              per_page: 100,
            }),
            octokit.rest.pulls.listReviews({
              owner: REPO_OWNER,
              repo: REPO_NAME,
              pull_number: pr.number,
            }),
          ]);

          if (filesResult.status === 'fulfilled') {
            const files = filesResult.value.data;
            engineer.filesChanged += files.length;
            files.forEach((file) => {
              const dir = file.filename.split('/')[0];
              engineer.directories.add(dir);
            });
          } else {
            console.error(`Error fetching files for PR #${pr.number}:`, filesResult.reason);
          }

          if (reviewsResult.status === 'fulfilled') {
            const reviews = reviewsResult.value.data;
            reviews.forEach((review) => {
              const reviewer = review.user?.login;
              if (!reviewer || reviewer === author) return;

              if (!includeBots && isBot(reviewer, review.user?.type)) {
                return;
              }

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
                reviewerData.reviewComments += review.body.length > 50 ? 1 : 0;
              }
            });
          } else {
            console.error(`Error fetching reviews for PR #${pr.number}:`, reviewsResult.reason);
          }
        })
      );

      console.log(`Processed batch ${batches.indexOf(batch) + 1}/${batches.length}`);
    }

    console.log(`⏱️ Batch processing: ${formatElapsedMs(batchesT0)}`);

    // Calculate impact scores
    const engineers: EngineerImpact[] = Array.from(engineerMap.values()).map((eng) => {
      // Impact scoring logic
      const reviewDepth = eng.reviewsGiven > 0 ? eng.reviewComments / eng.reviewsGiven : 0;
      const crossFunctionalReach = eng.directories.size;
      const unblockingScore = eng.reviewsGiven * 2; // Reviews help unblock others
      const qualityScore = eng.prsMerged * 10; // Assume merged PRs = good quality
      const avgFilesPerPR = eng.prsMerged > 0 ? eng.filesChanged / eng.prsMerged : 0;

      // Enhanced Collaboration Model — leverage and quality over raw output
      const impactScore =
        eng.reviewsGiven * 20 +
        reviewDepth * 10 +
        eng.prsMerged * 12 +
        crossFunctionalReach * 5 +
        Math.min(avgFilesPerPR, 20) * 3;

      const reasoning: string[] = [];
      if (eng.prsMerged > 10) reasoning.push(`Shipped ${eng.prsMerged} PRs`);
      if (eng.reviewsGiven > 20) reasoning.push(`Reviewed ${eng.reviewsGiven} PRs, unblocking teammates`);
      if (crossFunctionalReach > 5) reasoning.push(`Worked across ${crossFunctionalReach} different areas`);
      if (reviewDepth > 0.5) reasoning.push(`Thoughtful reviews with detailed feedback`);
      if (avgFilesPerPR > 10) reasoning.push(`Substantial changes averaging ${Math.round(avgFilesPerPR)} files per PR`);

      if (!includeBots && eng.reviewsGiven > 0 && eng.reviewsGiven < 5 && eng.prsMerged > 2) {
        reasoning.push(`Review count excludes bot-authored PRs`);
      }

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

    if (!includeBots) {
      const botsInFinalList = engineers.filter((eng) => isBot(eng.username));
      if (botsInFinalList.length > 0) {
        console.error('\n🚨 CRITICAL: Bots found in final engineer list despite filter!');
        botsInFinalList.forEach((bot) => {
          console.error(`  - ${bot.username} (${bot.impactScore} pts)`);
        });
      } else {
        console.log('\n✅ Bot filter verification passed - no bots in final list');
      }
    }

    const sortedEngineers = [...engineers].sort((a, b) => b.impactScore - a.impactScore);
    const topEngineers = sortedEngineers.slice(0, 5);
    const honorableMentions = sortedEngineers.slice(5, 10);

    // Debug: Check for specific engineer
    const pauldambraData = engineers.find((e) => e.username === 'pauldambra');
    if (pauldambraData) {
      console.log(`\n🔍 DEBUG: pauldambra found in engineer list - ${pauldambraData.impactScore} pts (${pauldambraData.metrics.prsMerged} PRs, ${pauldambraData.metrics.reviewsGiven} reviews)`);
    } else {
      console.log(`\n⚠️  DEBUG: pauldambra NOT found in engineer list (includeBots=${includeBots})`);
    }

    console.log(`\n👥 All ${engineers.length} Engineers Tracked:`);

    const engineersWithBotFlag = engineers.map((eng) => ({
      ...eng,
      hasBotInName: isBot(eng.username),
    }));

    const potentialBots = engineersWithBotFlag.filter((e) => e.hasBotInName);
    const realEngineers = engineersWithBotFlag.filter((e) => !e.hasBotInName);

    console.log(`  ✅ Real engineers: ${realEngineers.length}`);
    console.log(`  🤖 Potential bots: ${potentialBots.length}`);

    if (potentialBots.length > 0) {
      console.log(`\n⚠️  WARNING: Bots detected in engineer list!`);
      potentialBots.forEach((bot) => {
        console.log(`    - ${bot.username} (${bot.impactScore} pts, ${bot.metrics.prsMerged} PRs)`);
      });
    }

    console.log(`\n📊 Top 10 Engineers (by impact score):`);
    sortedEngineers.slice(0, 10).forEach((eng, idx) => {
        const botFlag = isBot(eng.username) ? ' 🤖 [BOT!]' : '';
        console.log(
          `  ${idx + 1}. ${eng.username}${botFlag} - ${eng.impactScore} pts ` +
            `(${eng.metrics.prsMerged} PRs, ${eng.metrics.reviewsGiven} reviews)`
        );
      });

    console.log(`\n🎯 Returning top 5 + ${honorableMentions.length} honorable mentions to client\n`);

    const response: DashboardData = {
      engineers: topEngineers,
      honorableMentions,
      metadata: {
        dataFrom: since,
        dataTo: new Date().toISOString(),
        totalPRs: filteredPRs.length,
        totalReviews: Array.from(engineerMap.values()).reduce(
          (sum, eng) => sum + eng.reviewsGiven,
          0
        ),
        analysisTimestamp: new Date().toISOString(),
      },
    };

    console.log(`⏱️ Analyze route (total): ${formatElapsedMs(analyzeT0)}`);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error analyzing GitHub data:', error);
    return NextResponse.json(
      { error: 'Failed to analyze GitHub data', details: String(error) },
      { status: 500 }
    );
  }
}
