import type { Config } from '@netlify/functions';
import { syncPremierLeague } from '../lib/premier-league-sync.mts';

export default async () => {
    const result = await syncPremierLeague();
    console.log(`Premier League synchronisée : ${result.count} matchs.`);
};

export const config: Config = {
    schedule: '0 1 * * *'
};
