'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DashboardData, EngineerImpact } from '@/types';

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeBots, setIncludeBots] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/analyze?includeBots=${includeBots}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setData(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [includeBots]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Analyzing PostHog repository...</p>
          <p className="text-gray-400 text-sm mt-2">Fetching 90 days of data</p>
        </div>
      </div>
    );
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
          <div className="flex gap-6 justify-center mt-4 text-sm text-gray-400">
            <span>📊 {data.metadata.totalPRs} PRs analyzed</span>
            <span>🔍 {data.metadata.totalReviews} reviews tracked</span>
            <span>📅 {new Date(data.metadata.dataFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(data.metadata.dataTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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
                setLoading(true);
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
            <EngineerCard key={engineer.username} engineer={engineer} rank={index + 1} />
          ))}
        </div>

        {/* Methodology */}
        <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-3">📐 Impact Methodology</h3>
          <p className="text-gray-300 mb-4">
            Impact is calculated using a composite score that values collaboration and code quality over raw output:
          </p>
          <ul className="text-gray-300 space-y-2 text-sm">
            <li>✅ <strong>PRs Merged (10pts each):</strong> Successful contributions shipped to production</li>
            <li>🤝 <strong>Reviews Given (15pts each):</strong> Unblocking teammates and sharing knowledge</li>
            <li>💬 <strong>Review Depth (5pts):</strong> Thoughtful, detailed feedback vs. rubber-stamping</li>
            <li>🌐 <strong>Cross-functional Reach (3pts):</strong> Working across different areas of the codebase</li>
            <li>📝 <strong>Code Impact (log scale):</strong> Scope of changes (prevents LOC gaming)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function EngineerCard({ engineer, rank }: { engineer: EngineerImpact; rank: number }) {
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:border-purple-500 transition-all">
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
          <h3 className="text-2xl font-bold text-white">{engineer.username}</h3>
          <div className="text-purple-400 text-3xl font-bold">
            {engineer.impactScore} <span className="text-sm text-gray-400">points</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <MetricBadge label="PRs Merged" value={engineer.metrics.prsMerged} />
        <MetricBadge label="Reviews Given" value={engineer.metrics.reviewsGiven} />
        <MetricBadge label="Review Depth" value={engineer.metrics.reviewDepth.toFixed(2)} />
        <MetricBadge label="Areas Touched" value={engineer.metrics.crossFunctionalReach} />
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
    </div>
  );
}

function MetricBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
      <div className="text-gray-400 text-xs uppercase">{label}</div>
      <div className="text-white text-xl font-bold">{value}</div>
    </div>
  );
}
