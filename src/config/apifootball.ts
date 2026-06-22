interface ApiFootballConfig {
  baseUrl: string;
  apiKey: string | undefined;
  host: string | undefined;
}

const config: ApiFootballConfig = {
  baseUrl: `https://${process.env.API_FOOTBALL_HOST}`,
  apiKey: process.env.API_FOOTBALL_KEY,
  host: process.env.API_FOOTBALL_HOST,
};

export default config;
