import axios from 'axios';
import 'dotenv/config';

(async () => {
  const response = await axios.get(
    'https://v3.football.api-sports.io/fixtures',
    {
      headers: {
        'x-apisports-key': process.env.API_FOOTBALL_KEY,
      },
      params: {
        league: 1,
        season: 2026,
        from: '2026-06-10',
        to: '2026-06-15',
        timezone: 'Africa/Johannesburg',
      },
    },
  );

  console.log(JSON.stringify(response.data, null, 2));
})();
