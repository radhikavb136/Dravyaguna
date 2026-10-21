import { writeFile } from 'node:fs/promises';

const baseUrl = (process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const token = process.env.EXPORT_ADMIN_TOKEN;
const outputPath = process.argv[2] || 'dravyaguna-herbs.csv';

if (!token) throw new Error('Set EXPORT_ADMIN_TOKEN to an admin API token; the token will not be displayed.');
const response = await fetch(`${baseUrl}/api/admin/export?format=csv`, { headers: { Authorization: `Bearer ${token}` } });
if (!response.ok) throw new Error(`Export request failed with HTTP ${response.status}; confirm the API is running and the account is an admin.`);
await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
process.stdout.write(`Wrote CSV export to ${outputPath}\n`);
