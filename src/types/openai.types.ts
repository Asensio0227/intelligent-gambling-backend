export interface GPTPredictionResponse {
  markets: {
    result: { prediction: 'HOME' | 'DRAW' | 'AWAY'; confidence: number };
    doubleChance: { prediction: 'HOME_OR_DRAW' | 'AWAY_OR_DRAW'; confidence: number };
    correctScore: { prediction: string; confidence: number };
    goalsOverUnder: { line: number; prediction: 'OVER' | 'UNDER'; confidence: number };
    bts: { prediction: boolean; confidence: number };
    cornersOverUnder: { line: number; prediction: 'OVER' | 'UNDER'; confidence: number };
    yellowCards: { line: number; prediction: 'OVER' | 'UNDER'; confidence: number };
    highestScoringHalf: { prediction: 'FIRST' | 'SECOND' | 'EQUAL'; confidence: number };
  };
  reasoning: {
    summary: string;
    perMarket: {
      result: string;
      doubleChance: string;
      correctScore: string;
      goalsOverUnder: string;
      bts: string;
      cornersOverUnder: string;
      yellowCards: string;
      highestScoringHalf: string;
    };
  };
}
