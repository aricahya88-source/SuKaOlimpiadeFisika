export function isSimulationUrlAllowed(value: string): boolean {
 try { const u=new URL(value); return u.protocol==='https:' && !u.username && !u.password && ['github.io','vercel.app','netlify.app'].some(domain=>u.hostname.endsWith('.'+domain)); } catch { return false; }
}
export const SIMULATION_MARKER='[SIMULATION]';
