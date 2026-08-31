const FIXTURES_URL = 'https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/2026-27/fixtures.csv';
const TEAMS_URL = 'https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/2026-27/teams.csv';

function parseCsvLine(line: string): string[] {
    const cells: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (quoted && line[i + 1] === '"') { cell += '"'; i++; }
            else quoted = !quoted;
        } else if (ch === ',' && !quoted) {
            cells.push(cell); cell = '';
        } else cell += ch;
    }
    cells.push(cell);
    return cells;
}

function parseCsv(text: string): Record<string, string>[] {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = parseCsvLine(lines[0]);
    return lines.slice(1).map(line => {
        const values = parseCsvLine(line);
        return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
    });
}

export async function syncPremierLeague(): Promise<{ count: number; updated: number }> {
    const supabaseUrl = Netlify.env.get('SUPABASE_URL');
    const supabaseKey = Netlify.env.get('SUPABASE_PUBLISHABLE_KEY');
    if (!supabaseUrl || !supabaseKey) throw new Error('Configuration Supabase manquante.');

    const [fixturesResponse, teamsResponse] = await Promise.all([fetch(FIXTURES_URL), fetch(TEAMS_URL)]);
    if (!fixturesResponse.ok || !teamsResponse.ok) throw new Error('Impossible de récupérer les données Premier League.');
    const fixtures = parseCsv(await fixturesResponse.text());
    const teams = parseCsv(await teamsResponse.text());
    const teamNames = new Map(teams.map(t => [t.id, t.name]));

    const rows = fixtures.map(f => ({
        id: `PL-${f.id}`,
        competition: 'PL',
        phase: `Journée ${f.event}`,
        order_index: Number(f.id),
        team1: teamNames.get(f.team_h) || f.team_h,
        team2: teamNames.get(f.team_a) || f.team_a,
        match_date: f.kickoff_time,
        score1: f.team_h_score === '' ? null : Number(f.team_h_score),
        score2: f.team_a_score === '' ? null : Number(f.team_a_score)
    }));

    for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const response = await fetch(`${supabaseUrl}/rest/v1/matches?on_conflict=id`, {
            method: 'POST',
            headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                Prefer: 'resolution=merge-duplicates,return=minimal'
            },
            body: JSON.stringify(batch)
        });
        if (!response.ok) throw new Error(`Erreur Supabase (${response.status}): ${await response.text()}`);
    }

    return { count: rows.length, updated: rows.length };
}
