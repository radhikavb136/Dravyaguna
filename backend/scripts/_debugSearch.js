import 'dotenv/config';
import { runSimpleSearch } from '../src/services/scoring/searchService.js';

const cough = await runSimpleSearch({ query: 'cough', role: 'clinician', limit: 5, offset: 0 });
console.log('cough', cough.results.length, cough.meta);
const digestive = await runSimpleSearch({ query: 'digestive pain', role: 'clinician', limit: 5, offset: 0 });
console.log('digestive', digestive.results.length, digestive.meta);
