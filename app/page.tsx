'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DashboardData, EngineerImpact } from '@/types';

const shimmerStyles = `
  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite;
    background: linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%);
    background-size: 1000px 100%;
  }
`;

function SkeletonBox({ className = '' }: { className?: string }) {
  return <div className={`bg-white/10 rounded animate-shimmer ${className}`} />;
}

function SkeletonCard() {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
      <div className="flex items-start gap-4 mb-4">
        <SkeletonBox className="h-16 w-16 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonBox className="h-6 w-32" />
          <SkeletonBox className="h-8 w-24" />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <SkeletonBox className="h-20" />
        <SkeletonBox className="h-20" />
        <SkeletonBox className="h-20" />
        <SkeletonBox className="h-20" />
      </div>

      <SkeletonBox className="mb-4 h-32" />

      <div className="space-y-2">
        <SkeletonBox className="h-4 w-full" />
        <SkeletonBox className="h-4 w-[85%]" />
        <SkeletonBox className="h-4 w-[70%]" />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <style dangerouslySetInnerHTML={{ __html: shimmerStyles }} />

      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <SkeletonBox className="mx-auto mb-2 h-12 w-full max-w-md sm:max-w-lg md:max-w-2xl" />
          <SkeletonBox className="mx-auto mb-4 h-6 w-64 max-w-[80%]" />
          <div className="flex flex-wrap justify-center gap-6">
            <SkeletonBox className="h-4 w-32" />
            <SkeletonBox className="h-4 w-32" />
            <SkeletonBox className="h-4 w-40" />
          </div>
        </div>

        <SkeletonBox className="mb-6 h-16 w-full rounded-lg" />

        <div className="mb-8 rounded-lg border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
          <SkeletonBox className="mb-4 h-6 w-48" />
          <SkeletonBox className="h-64 w-full" />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        <SkeletonBox className="mb-8 h-32 w-full rounded-lg" />

        <SkeletonBox className="h-48 w-full rounded-lg" />
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeBots, setIncludeBots] = useState(false);
  const [cache, setCache] = useState<{
    withBots?: DashboardData;
    withoutBots?: DashboardData;
  }>({});
  const [llmSummaries, setLlmSummaries] = useState<Record<string, string>>({});
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    const cacheKey = includeBots ? 'withBots' : 'withoutBots';

    if (cache[cacheKey]) {
      console.log(`✅ Using cached data for ${cacheKey}`);
      setData(cache[cacheKey]!);
      setError(null);
      setLoading(false);
      return;
    }

    console.log(`📡 Fetching fresh data for ${cacheKey}...`);
    setLoading(true);
    setError(null);

    fetch(`/api/analyze?includeBots=${includeBots}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setData(data);
          setCache((prev) => ({ ...prev, [cacheKey]: data }));
          console.log(`💾 Cached data for ${cacheKey}`);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [includeBots]);

  useEffect(() => {
    if (!data?.engineers?.length) return;

    setLlmSummaries({});
    setSummaryLoading(true);

    fetch('/api/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engineers: data.engineers }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.summaries) {
          setLlmSummaries(result.summaries);
          console.log(result.cached ? '✅ Summaries from cache' : '🤖 Fresh LLM summaries');
        }
        setSummaryLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load summary:', err);
        setSummaryLoading(false);
      });
  }, [data]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 max-w-md">
          <h2 className="text-red-300 text-xl font-bold mb-2">Error</h2>
          <p className="text-red-200">{error || 'Failed to load data'}</p>
        </div>
      </div>
    );
  }

  const chartData = data.engineers.map((eng) => ({
    name: eng.username,
    'Impact Score': eng.impactScore,
    'PRs Merged': eng.metrics.prsMerged,
    'Reviews Given': eng.metrics.reviewsGiven,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">
            PostHog Engineering Impact
          </h1>
          <p className="text-gray-300 text-lg">
            Top 5 Most Impactful Engineers (Last 90 Days)
          </p>
          <div className="flex flex-wrap gap-6 justify-center items-center mt-4 text-sm text-gray-400">
            <span>📊 {data.metadata.totalPRs} PRs analyzed</span>
            <span>🔍 {data.metadata.totalReviews} reviews tracked</span>
            <span>📅 {new Date(data.metadata.dataFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(data.metadata.dataTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            {cache.withBots && cache.withoutBots && (
              <span className="text-green-400 text-xs">✓ Both datasets cached</span>
            )}
          </div>
        </div>

        {/* Bot Filter Toggle */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 mb-6 border border-white/10">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeBots}
              onChange={(e) => {
                setIncludeBots(e.target.checked);
              }}
              className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-gray-300">
              <span className="font-semibold">Include bot accounts</span>
              <span className="text-sm text-gray-400 ml-2">
                (dependabot, github-actions, etc.)
              </span>
            </span>
          </label>

          {!includeBots && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs text-yellow-300 flex items-center gap-2">
                <span className="text-base shrink-0">ℹ️</span>
                <span>
                  <strong>Note:</strong> Impact scores exclude bot PRs and reviews. Some engineers may have
                  lower scores due to filtered bot interactions.
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Impact Score Chart */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">Impact Score Overview</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="name" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e1b4b',
                  border: '1px solid #6366f1',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="Impact Score" fill="#8b5cf6" />
              <Bar dataKey="PRs Merged" fill="#3b82f6" />
              <Bar dataKey="Reviews Given" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Engineer Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.engineers.map((engineer, index) => (
            <EngineerCard
              key={engineer.username}
              engineer={engineer}
              rank={index + 1}
              aiSummary={llmSummaries[engineer.username]}
              summaryLoading={summaryLoading && !llmSummaries[engineer.username]}
            />
          ))}
        </div>

        {data.honorableMentions && data.honorableMentions.length > 0 && (
          <div className="mb-8 mt-8">
            <h2 className="mb-4 text-center text-2xl font-bold text-white">
              🎖️ Honorable Mentions (Ranks 6-10)
            </h2>

            <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
              <table className="w-full min-w-[36rem]">
                <thead className="border-b border-white/10 bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400">Engineer</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-400">Score</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-400">PRs</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-400">Reviews</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-400">Quality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {data.honorableMentions.map((engineer, index) => (
                    <tr key={engineer.username} className="transition-colors hover:bg-white/5">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-gray-400">#{index + 6}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={engineer.avatar_url}
                            alt=""
                            className="h-8 w-8 rounded-full border border-purple-500"
                          />
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{engineer.username}</span>
                            <a
                              href={`https://github.com/${engineer.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 transition-colors hover:text-purple-400"
                              title={`View ${engineer.username}'s GitHub profile`}
                              aria-label={`View ${engineer.username}'s GitHub profile (opens in new tab)`}
                            >
                              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path
                                  fillRule="evenodd"
                                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono font-bold text-purple-400">{engineer.impactScore}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-gray-300">{engineer.metrics.prsMerged}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-gray-300">{engineer.metrics.reviewsGiven}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-gray-300">
                          {Math.round(engineer.metrics.reviewDepth * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Methodology */}
        <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-3">📐 Impact Methodology</h3>
          <p className="text-gray-300 mb-4">
            Impact is calculated using a composite score that values collaboration and code quality over raw output:
          </p>
          <ul className="text-gray-300 space-y-2 text-sm">
            <li>
              🥇 <strong>Reviews Given (20pts each):</strong> Highest impact — unblocks team, multiplies velocity
            </li>
            <li>
              🥈 <strong>Review Depth (10pts):</strong> Quality over quantity — thoughtful feedback vs. rubber-stamping
            </li>
            <li>
              🥉 <strong>PRs Merged (12pts each):</strong> Shipping code is essential but not a team multiplier
            </li>
            <li>
              🌐 <strong>Cross-functional Reach (5pts):</strong> Generalists reduce bottlenecks, spread knowledge
            </li>
            <li>
              📝 <strong>Code Impact (3pts, capped):</strong> Scope matters, but capped to prevent LOC gaming
            </li>
          </ul>
          <p className="text-gray-400 text-xs mt-3 italic">
            Philosophy: Impact = Leverage × Quality. We prioritize actions that multiply team output.
          </p>
        </div>
      </div>
    </div>
  );
}

function ScoreRow({
  label,
  count,
  multiplier,
  total,
  decimals = 0,
}: {
  label: string;
  count: number;
  multiplier: number;
  total: number;
  decimals?: number;
}) {
  const points = Math.round(count * multiplier);
  const percentage = total > 0 ? Math.round((points / total) * 100) : 0;
  const displayCount = decimals > 0 ? count.toFixed(decimals) : String(count);

  return (
    <div className="flex justify-between gap-2 text-gray-300">
      <span className="min-w-0">
        {label} ({displayCount} × {multiplier}pts)
      </span>
      <span className="flex items-center gap-2 shrink-0 tabular-nums">
        <span className="text-purple-400 font-mono">{points}</span>
        <span className="text-gray-500 text-xs">({percentage}%)</span>
      </span>
    </div>
  );
}

function EngineerCard({
  engineer,
  rank,
  aiSummary,
  summaryLoading,
}: {
  engineer: EngineerImpact;
  rank: number;
  aiSummary?: string;
  summaryLoading?: boolean;
}) {
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  return (
    <div className="overflow-visible bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:border-purple-500 transition-all">
      <div className="flex items-start gap-4 mb-4">
        <div className="relative">
          <img
            src={engineer.avatar_url}
            alt={engineer.username}
            className="w-16 h-16 rounded-full border-2 border-purple-500"
          />
          <span className="absolute -top-2 -right-2 text-2xl">{medals[rank - 1]}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-bold text-white">{engineer.username}</h3>
            <a
              href={`https://github.com/${engineer.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 transition-colors hover:text-purple-400"
              title={`View ${engineer.username}'s GitHub profile`}
              aria-label={`View ${engineer.username}'s GitHub profile (opens in new tab)`}
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
          <div className="text-purple-400 text-3xl font-bold">
            {engineer.impactScore} <span className="text-sm text-gray-400">points</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <MetricBadge
          label="PRs Merged"
          value={engineer.metrics.prsMerged}
          tooltip="Pull requests successfully merged and shipped to production"
        />
        <MetricBadge
          label="Reviews Given"
          value={engineer.metrics.reviewsGiven}
          tooltip="Number of PRs reviewed for teammates (excludes bot PRs when filtered)"
        />
        <MetricBadge
          label="Review Quality"
          value={`${Math.round(engineer.metrics.reviewDepth * 100)}%`}
          tooltip="Percentage of reviews with substantial feedback (>50 chars). Higher = more thorough vs rubber-stamping."
        />
        <MetricBadge
          label="Areas Touched"
          value={engineer.metrics.crossFunctionalReach}
          tooltip="Unique top-level directories modified. Higher = broader codebase knowledge."
        />
      </div>

      <div className="mb-4 bg-white/5 rounded-lg p-3 border border-white/10">
        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Score Breakdown:</h4>
        <div className="space-y-1 text-xs">
          <ScoreRow
            label="Reviews Given"
            count={engineer.metrics.reviewsGiven}
            multiplier={20}
            total={engineer.impactScore}
          />
          <ScoreRow
            label="Review Depth"
            count={engineer.metrics.reviewDepth}
            multiplier={10}
            total={engineer.impactScore}
            decimals={2}
          />
          <ScoreRow
            label="PRs Merged"
            count={engineer.metrics.prsMerged}
            multiplier={12}
            total={engineer.impactScore}
          />
          <ScoreRow
            label="Cross-functional Reach"
            count={engineer.metrics.crossFunctionalReach}
            multiplier={5}
            total={engineer.impactScore}
          />
          <ScoreRow
            label="Code Impact"
            count={Math.min(engineer.metrics.codeImpact, 20)}
            multiplier={3}
            total={engineer.impactScore}
          />
          <div className="flex justify-between pt-2 mt-2 border-t border-white/20 font-semibold text-gray-200 gap-2">
            <span>Total Impact Score</span>
            <span className="text-purple-300 font-mono tabular-nums shrink-0">{engineer.impactScore}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-400 uppercase">Why They're Impactful:</h4>
        <ul className="space-y-1">
          {engineer.reasoning.map((reason, i) => (
            <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
              <span className="text-green-400 mt-0.5">▸</span>
              {reason}
            </li>
          ))}
        </ul>
      </div>

      {(aiSummary || summaryLoading) && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-lg">🤖</span>
            <h5 className="text-xs font-semibold text-gray-400 uppercase">AI Insight</h5>
          </div>

          {summaryLoading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <div className="animate-spin rounded-full h-3 w-3 border-t border-b border-purple-400"></div>
              <span className="text-xs">Analyzing...</span>
            </div>
          ) : aiSummary ? (
            <p className="text-gray-300 text-sm leading-relaxed italic">{`"${aiSummary}"`}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function MetricBadge({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: string | number;
  tooltip?: string;
}) {
  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10 relative group">
      <div className="text-gray-400 text-xs uppercase flex items-center gap-1">
        {label}
        {tooltip ? <span className="text-gray-500 cursor-help select-none">ℹ️</span> : null}
      </div>
      <div className="text-white text-xl font-bold">{value}</div>

      {tooltip ? (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 z-20 mb-2 w-48 -translate-x-1/2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-center text-xs text-white opacity-0 shadow-lg transition-all duration-200 invisible group-hover:opacity-100 group-hover:visible"
        >
          {tooltip}
          <div className="absolute left-1/2 top-full -mt-1 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      ) : null}
    </div>
  );
}
