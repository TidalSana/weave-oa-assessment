import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { EngineerImpact } from '@/types';

const cache = new Map<string, { summaries: Record<string, string>; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 503 }
      );
    }

    const { engineers } = await request.json();

    if (!engineers || !Array.isArray(engineers) || engineers.length === 0) {
      return NextResponse.json({ error: 'Invalid engineers data' }, { status: 400 });
    }

    const list = engineers as EngineerImpact[];
    const cacheKey = list.map((e) => e.username).join('-');

    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('✅ Using cached LLM summaries');
      return NextResponse.json({ summaries: cached.summaries, cached: true });
    }

    console.log('🤖 Generating LLM summaries...');
    const summaryT0 = performance.now();

    const anthropic = new Anthropic({ apiKey });
    const prompt = buildPrompt(list);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const first = message.content[0];
    const rawSummary = first?.type === 'text' ? first.text : '';

    console.log(`⏱️ LLM summaries generated in ${Math.round(performance.now() - summaryT0)}ms`);

    const summaries = parseSummaries(rawSummary, list);
    cache.set(cacheKey, { summaries, timestamp: Date.now() });

    return NextResponse.json({ summaries, cached: false });
  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary', details: String(error) },
      { status: 500 }
    );
  }
}

function buildPrompt(engineers: EngineerImpact[]): string {
  const engineerData = engineers
    .map(
      (eng, idx) =>
        `${idx + 1}. **${eng.username}** (${eng.impactScore} pts)
   - PRs: ${eng.metrics.prsMerged}
   - Reviews: ${eng.metrics.reviewsGiven}
   - Cross-functional reach: ${eng.metrics.crossFunctionalReach} areas
   - Review depth: ${eng.metrics.reviewDepth}
   - Reasoning: ${eng.reasoning.join('; ')}`
    )
    .join('\n\n');

  return `You are analyzing PostHog's top 5 most impactful engineers over the last 90 days.

Here are the top 5 engineers and their metrics:

${engineerData}

For EACH engineer, write a concise 1-2 sentence summary explaining their specific impact and what makes them stand out. Focus on their unique contribution style.

Return your response in this EXACT format:

1. [Engineer name]: [1-2 sentence summary]
2. [Engineer name]: [1-2 sentence summary]
3. [Engineer name]: [1-2 sentence summary]
4. [Engineer name]: [1-2 sentence summary]
5. [Engineer name]: [1-2 sentence summary]

Be specific about each engineer's unique strengths. No generic statements.`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseSummaries(rawSummary: string, engineers: EngineerImpact[]): Record<string, string> {
  const summaries: Record<string, string> = {};
  const lines = rawSummary.split('\n').filter((line) => line.trim());

  engineers.forEach((eng, idx) => {
    const escaped = escapeRegExp(eng.username);
    const pattern = new RegExp(
      `^\\s*${idx + 1}\\.\\s*(?:\\*\\*)?${escaped}(?:\\*\\*)?:\\s*(.+)$`,
      'i'
    );

    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        summaries[eng.username] = match[1].trim();
        break;
      }
    }

    if (!summaries[eng.username]) {
      summaries[eng.username] = 'Impactful contributor to the PostHog team.';
    }
  });

  return summaries;
}
