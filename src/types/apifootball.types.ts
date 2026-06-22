export interface ApiFootballTeam {
  id?: number;
  name?: string;
  logo?: string;
}

export interface ApiFootballLeague {
  id?: number;
  name?: string;
  country?: string;
  logo?: string;
  flag?: string;
  season?: number;
}

export interface ApiFootballGoals {
  home?: number | null;
  away?: number | null;
}

export interface ApiFootballScore {
  halftime?: ApiFootballGoals;
  fulltime?: ApiFootballGoals;
  extratime?: ApiFootballGoals;
  penalty?: ApiFootballGoals;
}

export interface ApiFootballVenue {
  id?: number;
  name?: string;
  city?: string;
}

export interface ApiFootballFixture {
  fixture?: {
    id?: number;
    referee?: string | null;
    timezone?: string;
    date?: string;
    timestamp?: number;
    periods?: { first?: number | null; second?: number | null };
    venue?: ApiFootballVenue;
    status?: { long?: string; short?: string; elapsed?: number | null };
  };
  league?: ApiFootballLeague;
  teams?: {
    home?: ApiFootballTeam;
    away?: ApiFootballTeam;
  };
  goals?: ApiFootballGoals;
  score?: ApiFootballScore;
  events?: unknown[];
  lineups?: unknown[];
  statistics?: unknown[];
  players?: unknown[];
}

export interface ApiFootballTeamStatsResponse {
  team?: { id?: number; name?: string; logo?: string };
  statistics?: Array<{
    league?: ApiFootballLeague;
    form?: string | null;
    played?: number;
    wins?: number;
    draws?: number;
    loses?: number;
    goals?: {
      for?: number;
      against?: number;
    };
    [key: string]: unknown;
  }>;
}

export interface ApiFootballResponse<T> {
  get?: string;
  response?: T[];
  results?: number;
  paging?: { current?: number; total?: number };
  errors?: unknown[];
}
