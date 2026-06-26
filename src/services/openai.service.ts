import logger from '../utils/logger';
import { openaiClient, model } from '../config/openai';
import { estimateTokensFromText } from '../utils/tokenCounter.utils';
import { normalizeConfidence } from '../utils/confidence.utils';
import { IFixtureDocument } from '../models/Fixture';
import { IH2HHistoryDocument } from '../models/H2HHistory';
import { IDataSnapshot, ITokensUsed } from '../types/models.types';
import { GPTPredictionResponse } from '../types/openai.types';

export const buildPredictionPrompt = (
  fixture: IFixtureDocument,
  dataSnapshot: IDataSnapshot,
  h2hHistory: IH2HHistoryDocument,
  similarMatches: any[] = [],
  accuracyStats: any[] = [],
): string => {
  const lines: string[] = [];
  lines.push(`You are an expert football prediction analyst with deep knowledge of international and club football. Your task is to analyze the provided match data and generate predictions with confidence scores for 8 markets.

IMPORTANT INSTRUCTIONS:
- When statistical data is provided (form, averages, h2h history), use it as your PRIMARY source
- When statistical data is empty, zero, or missing, USE YOUR OWN TRAINING KNOWLEDGE about these teams — their historical performance, playing style, key players, recent tournament form, and head-to-head records
- For World Cup matches especially, you have extensive knowledge of national team strengths, tactical setups, and typical performance patterns — apply this knowledge confidently
- Never return all confidence scores at 50 — this means you are not using your knowledge. Always reason from what you know
- Confidence scores should reflect genuine analytical assessment: 70-85% for strong signals, 55-70% for moderate signals, 40-55% for genuinely uncertain outcomes
- Correct score predictions will naturally have lower confidence (20-40%) — this is expected
- For the doubleChance market: predict HOME_OR_DRAW if the home side is favoured or a draw is likely (i.e. away win is the unlikely outcome), or AWAY_OR_DRAW if the away side is favoured or a draw is likely (i.e. home win is the unlikely outcome). This must be consistent with your result prediction.
- Return ONLY valid JSON with no extra text, no markdown, no preamble

CONFIDENCE SCORE GUIDANCE:
- 80-90%: Very strong signal, multiple factors align
- 70-79%: Strong signal, clear favourite or pattern
- 60-69%: Moderate signal, some uncertainty
- 50-59%: Slight lean, genuinely competitive
- 40-49%: High uncertainty, use sparingly
- Below 40%: Only for correct score market

You must always return the exact JSON structure specified in the user message.`);
  lines.push('');
  lines.push('Fixture:');
  lines.push(`Home team: ${fixture.homeTeam?.name}`);
  lines.push(`Away team: ${fixture.awayTeam?.name}`);
  lines.push(`Kickoff: ${fixture.kickoff}`);
  lines.push(`League: ${fixture.league?.name}`);
  lines.push('');
  lines.push('Data snapshot:');
  lines.push(JSON.stringify(dataSnapshot, null, 2));
  if (h2hHistory && h2hHistory.matches && h2hHistory.matches.length) {
    lines.push('');
    lines.push('Recent H2H history:');
    lines.push(JSON.stringify(h2hHistory.matches.slice(-5), null, 2));
  }
  if (similarMatches.length > 0) {
    lines.push('');
    lines.push('SIMILAR HISTORICAL MATCHES (for pattern reference):');
    similarMatches.forEach((m, i) => {
      lines.push(
        `${i + 1}. ${m.homeTeam} vs ${m.awayTeam} (${m.score}) — similarity ${Math.round((m.similarityScore ?? 0) * 100)}%. ` +
        `Past reasoning: ${m.reasoning?.slice(0, 200) ?? 'N/A'}`
      );
    });
    lines.push('Use these as soft pattern references only — they do not override the current match data above.');
  }

  if (accuracyStats.length > 0) {
    lines.push('');
    lines.push('YOUR HISTORICAL ACCURACY BY MARKET (self-calibration reference):');
    accuracyStats.forEach((s) => {
      lines.push(`- ${s.market}: ${s.accuracyPct}% accurate over last ${s.totalResolved} resolved predictions.`);
    });
    lines.push(
      'For markets where your historical accuracy is below 55%, lower your confidence scores ' +
      'accordingly and lean toward more conservative predictions for that market. For markets ' +
      'above 70% accuracy, you may express confidence more freely when the signal is strong.'
    );
  }

  lines.push('');
  lines.push('Return only this JSON object with no extra text:');
  lines.push(
    JSON.stringify(
      {
        markets: {
          result: { prediction: 'HOME|DRAW|AWAY', confidence: 0 },
          doubleChance: { prediction: 'HOME_OR_DRAW|AWAY_OR_DRAW', confidence: 0 },
          correctScore: { prediction: 'X-X', confidence: 0 },
          goalsOverUnder: {
            line: 2.5,
            prediction: 'OVER|UNDER',
            confidence: 0,
          },
          bts: { prediction: true, confidence: 0 },
          cornersOverUnder: {
            line: 9.5,
            prediction: 'OVER|UNDER',
            confidence: 0,
          },
          yellowCards: { line: 3.5, prediction: 'OVER|UNDER', confidence: 0 },
          highestScoringHalf: {
            prediction: 'FIRST|SECOND|EQUAL',
            confidence: 0,
          },
        },
        reasoning: {
          summary: 'string',
          perMarket: {
            result: 'string',
            doubleChance: 'string',
            correctScore: 'string',
            goalsOverUnder: 'string',
            bts: 'string',
            cornersOverUnder: 'string',
            yellowCards: 'string',
            highestScoringHalf: 'string',
          },
        },
      },
      null,
      2,
    ),
  );
  return lines.join('\n');
};

const parseResponse = (text: string): GPTPredictionResponse => {
  try {
    const json = JSON.parse(text.trim());
    if (!json.markets || !json.reasoning) {
      throw new Error('Invalid prompt response structure');
    }
    // Normalize all confidence values
    for (const market of Object.values(json.markets)) {
      if ((market as { confidence?: number }).confidence !== undefined) {
        (market as { confidence?: number }).confidence = normalizeConfidence(
          (market as { confidence?: number }).confidence,
        );
      }
    }
    return json;
  } catch (error) {
    throw new Error(
      `Failed to parse OpenAI response: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

export const generatePrediction = async (
  fixture: IFixtureDocument,
  dataSnapshot: IDataSnapshot,
  h2hHistory: IH2HHistoryDocument,
  similarMatches: any[] = [],
  accuracyStats: any[] = [],
): Promise<GPTPredictionResponse & { tokensUsed: ITokensUsed }> => {
  if (!openaiClient) {
    throw new Error(
      'OpenAI client is not configured. Set OPENAI_API_KEY to enable predictions.',
    );
  }
  const prompt = buildPredictionPrompt(fixture, dataSnapshot, h2hHistory, similarMatches, accuracyStats);
  const start = Date.now();
  
  // TODO: type this - OpenAI Responses API type may differ from Chat API
  const response = await (openaiClient.responses.create as any)({
    model,
    input: prompt,
  });
  
  const duration = Date.now() - start;
  const outputText =
    (response as any).output_text ||
    ((response as any).output?.map?.((item: any) => item.content) || []).join(' ') ||
    '';
  
  const parsed = parseResponse(outputText);
  const usage = (response as any).usage || {};
  
  const inputTokens = usage.promptTokens || estimateTokensFromText(prompt);
  const outputTokens = usage.completionTokens || estimateTokensFromText(outputText);

  // GPT-4.1 pricing: $2.00 per 1M input tokens, $8.00 per 1M output tokens
  // Adjust MODEL_INPUT_COST and MODEL_OUTPUT_COST if you switch models
  const MODEL_INPUT_COST = 2.00 / 1_000_000;
  const MODEL_OUTPUT_COST = 8.00 / 1_000_000;

  const totalCost = (inputTokens * MODEL_INPUT_COST) + (outputTokens * MODEL_OUTPUT_COST);

  const tokens: ITokensUsed = {
    input: inputTokens,
    output: outputTokens,
    totalCost: Math.round(totalCost * 1_000_000) / 1_000_000, // round to 6 decimal places
  };

  logger.info('OpenAI prediction', {
    fixtureId: fixture._id.toString(),
    model,
    tokensUsed: tokens,
    durationMs: duration,
  });

  return { ...parsed, tokensUsed: tokens };
};
