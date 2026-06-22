import { model, openaiClient } from '../config/openai';
import { IAutoGenerateTicketParams } from '../types/models.types';
import logger from '../utils/logger';

export const parseNaturalLanguageQuery = async (
  query: string,
): Promise<IAutoGenerateTicketParams> => {
  if (!openaiClient) {
    throw new Error('OpenAI client not configured');
  }

  // Build system prompt instructing GPT to parse natural language into IAutoGenerateTicketParams JSON
  const systemPrompt = `You are a natural language parser for sports betting ticket generation. Parse user queries into JSON configuration.

Return ONLY valid JSON, no extra text, no markdown, no code blocks. The JSON must match this schema:
{
  "numberOfTickets": number (1-10),
  "legsPerTicket": number (5-8),
  "minConfidence": number (0-100),
  "diversify": boolean,
  "preferredMarkets": string[] optional
}

Apply these defaults if not specified:
- numberOfTickets: 3
- legsPerTicket: 5
- minConfidence: 70
- diversify: true

Recognize these patterns:
- "3 tickets of 5 teams" → numberOfTickets:3, legsPerTicket:5
- "high confidence" / "high probability" → minConfidence:75
- "very high confidence" → minConfidence:85
- "only goals" / "goals markets" → preferredMarkets:["goalsOverUnder","bts"]
- "winner predictions" / "match results" → preferredMarkets:["result"]
- "corners" → preferredMarkets:["cornersOverUnder"]
- "both teams to score" / "bts" → preferredMarkets:["bts"]
- "no repeat" / "different fixtures" → diversify:true

Valid market values: result, correctScore, goalsOverUnder, bts, cornersOverUnder, yellowCards, highestScoringHalf`;

  try {
    const response = await openaiClient.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: query,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse JSON response
    const parsed = JSON.parse(content);

    // Validate and apply defaults
    const params: IAutoGenerateTicketParams = {
      numberOfTickets: Math.min(Math.max(parsed.numberOfTickets || 3, 1), 10),
      legsPerTicket: Math.min(Math.max(parsed.legsPerTicket || 5, 5), 8),
      minConfidence: Math.min(Math.max(parsed.minConfidence || 70, 0), 100),
      diversify: parsed.diversify !== false,
      preferredMarkets: parsed.preferredMarkets,
    };

    logger.info('Natural language query parsed', { query, params });

    return params;
  } catch (error) {
    logger.error('Natural language parsing failed', {
      query,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
