const FIXTURES_URL = 'https://fantasy.premierleague.com/api/fixtures/';
const TEAMS_URL = 'https://fantasy.premierleague.com/api/bootstrap-static/';

export async function syncPremierLeague(): Promise<{ count: number; updated: number }> {
    const supabaseUrl = Netlify.env.get('SUPABASE_URL');
    const supabaseKey = Netlify.env.get('SUPABASE_PUBLISHABLE_KEY');
    if (!supabaseUrl || !supabaseKey) throw new Error('Configuration Supabase manquante.');

    const [fixturesResponse, teamsResponse] = await Promise.all([fetch(FIXTURES_URL), fetch(TEAMS_URL)]);
    if (!fixturesResponse.ok || !teamsResponse.ok) throw new Error('Impossible de récupérer les données Premier League.');
    const fixtures = await fixturesResponse.json() as Array<Record<string, unknown>>;
    const bootstrap = await teamsResponse.json() as { teams?: Array<Record<string, unknown>> };
    const teams = bootstrap.teams || [];
    const teamNames = new Map(teams.map(t => [String(t.id), String(t.name)]));

    const normalizeTeam = (name: string) => ({
        'Bournemouth': 'AFC Bournemouth',
        'Brighton': 'Brighton & Hove Albion',
        'Leeds': 'Leeds United',
        'Man City': 'Manchester City',
        'Man Utd': 'Manchester United',
        "Nott'm Forest": 'Nottingham Forest',
        'Spurs': 'Tottenham Hotspur'
    } as Record<string, string>)[name] || name;

    const rows = fixtures.filter(f => f.id != null && f.kickoff_time).map(f => {
        const row: Record<string, unknown> = {
            id: `PL-${f.id}`,
            competition: 'PL',
            phase: `Journée ${f.event}`,
            order_index: Number(f.id),
            team1: normalizeTeam(teamNames.get(String(f.team_h)) || String(f.team_h)),
            team2: normalizeTeam(teamNames.get(String(f.team_a)) || String(f.team_a)),
            match_date: f.kickoff_time
        };
        const score1 = f.team_h_score == null ? null : Number(f.team_h_score);
        const score2 = f.team_a_score == null ? null : Number(f.team_a_score);
        if (score1 != null && Number.isFinite(score1)) row.score1 = score1;
        if (score2 != null && Number.isFinite(score2)) row.score2 = score2;
        return row;
    });

    for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const response = await fetch(`${supabaseUrl}/rest/v1/matches?on_conflict=id`, {
            method: 'POST',
            headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify(batch)
        });
        if (!response.ok) throw new Error(`Erreur Supabase (${response.status}): ${await response.text()}`);
    }
    return { count: rows.length, updated: rows.length };
}
