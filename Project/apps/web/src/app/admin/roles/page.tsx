import { PERMISSIONS, ROLES } from '@skyspace/shared';
import { PageHeader } from '@/components/dashboard/DashboardShell';

export default function RolesPage() {
  const perms = Object.entries(PERMISSIONS) as [string, readonly string[]][];
  return (
    <>
      <PageHeader title="Roles & permissions" description="The permission matrix enforced by the API on every protected request. Assign roles from a user’s page. Ownership and assignment rules apply on top of these permissions." />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Permission matrix</caption>
          <thead className="bg-surface text-xs text-muted uppercase">
            <tr><th scope="col" className="px-4 py-3 text-left font-medium">Permission</th>{ROLES.map((r) => <th key={r} scope="col" className="px-4 py-3 text-center font-medium">{r}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {perms.map(([p, roles]) => (
              <tr key={p}>
                <th scope="row" className="px-4 py-2 text-left font-mono text-xs font-normal">{p}</th>
                {ROLES.map((r) => <td key={r} className="px-4 py-2 text-center">{roles.includes(r) ? <span className="text-emerald-700" aria-label="Allowed">✓</span> : <span className="text-muted/50" aria-label="Not allowed">—</span>}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
