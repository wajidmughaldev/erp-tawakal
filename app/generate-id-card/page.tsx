'use client';
import {Suspense, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {PortalShell} from '@/components/portal/portal-shell';
import {PageHeader} from '@/components/portal/page-header';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {DataState} from '@/components/portal/data-state';
import {IdCardFront, IdCardSheet, cardDate} from '@/components/portal/id-card-preview';
import {CardColourControl} from '@/components/portal/card-colour-control';
import {employeesApi, cardsApi} from '@/lib/services';
import {useResource} from '@/lib/use-resource';
import type {IDCard} from '@/lib/contracts';
import {workingStatuses} from '@/lib/contracts';

function GenerateContent() {
  const params = useSearchParams();
  const [employeeId, setEmployeeId] = useState(params.get('employee') ?? params.get('id') ?? '');
  const [years, setYears] = useState(1);
  const [issued, setIssued] = useState<IDCard>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const policy = useResource(cardsApi.policy);
  const term = policy.data?.data;
  const eligible = useResource(cardsApi.eligibleEmployees);
  const selected = useResource(() => employeeId ? employeesApi.get(employeeId) : Promise.resolve(null), [employeeId]);
  const employee = selected.data?.data;
  const isEligible = Boolean(employeeId) && Boolean(eligible.data?.data.some(item => item.id === employeeId));
  const alreadyHasCard = Boolean(employeeId) && !eligible.loading && !eligible.error && !isEligible && !issued;

  async function issue() {
    if (busy || !employee || !isEligible || !workingStatuses.includes(employee.status) || !term?.canIssue) return;
    if (!window.confirm(`Issue a card for ${employee.name}?`)) return;
    setBusy(true); setError('');
    try {
      const response = await cardsApi.issue(employee.id, term.mode === 'selected_years' ? years : undefined);
      if (!response.data?.id || !response.data.number || !response.data.expiryDate) throw new Error('The server did not confirm official card details.');
      setIssued(response.data);
      eligible.refetch(); selected.refetch();
    } catch (cause) {setError(cause instanceof Error ? cause.message : 'Unable to issue card.');}
    finally {setBusy(false);}
  }

  return (
    <PortalShell>
      <PageHeader title="Generate ID Card" description="Select an employee and issue a smart credential." />
      <Card>
        <CardContent className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <DataState {...eligible} retry={eligible.refetch} />
            <label className="block text-sm font-medium text-slate-600">Employee
              <select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" disabled={busy} value={employeeId} onChange={event => {setEmployeeId(event.target.value); setIssued(undefined); setError('');}}>
                <option value="">Select an employee</option>
                {employee && !eligible.data?.data.some(item => item.id === employee.id) && <option value={employee.id}>{employee.displayId} — {employee.name}</option>}
                {eligible.data?.data.map(item => <option key={item.id} value={item.id}>{item.displayId} — {item.name}</option>)}
              </select>
            </label>
            {eligible.data && !eligible.data.data.length && <p className="text-sm text-slate-500">Every working employee already has a card.</p>}
            {alreadyHasCard && <p role="alert" className="text-sm text-amber-700">This employee already has a card. Renew or reissue it from the ID Cards list instead.</p>}
            <DataState {...selected} retry={selected.refetch} />
            <DataState {...policy} retry={policy.refetch} />
            <div className="text-sm font-medium text-slate-600">Card Validity
              {term?.mode === 'selected_years'
                ? <select className="mt-1 block h-10 w-full rounded border px-3 text-sm" disabled={busy} value={years} onChange={event => setYears(Number(event.target.value))}><option value={1}>1 Year</option><option value={2}>2 Years</option></select>
                : <span className="mt-1 block text-sm font-normal text-slate-900">{term?.termLabel ?? 'Loading policy…'}</span>}
            </div>
            <CardColourControl />
            {term && !term.canIssue && <p className="text-xs text-amber-700">Card issuance is unavailable until a validity policy is configured.</p>}
            <Button disabled={busy || !employee || !isEligible || !term?.canIssue || Boolean(issued)} onClick={() => void issue()}>{busy ? 'Issuing…' : 'Generate Card'}</Button>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            {issued && (
              <div role="status" className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm">
                Card issued: {issued.number}
                <Link className="ml-3 text-blue-700" href={'/id-cards/view?id=' + encodeURIComponent(issued.id)}>View and print ID Card</Link>
              </div>
            )}
          </div>
          <div>
            {employee
              ? (
                <IdCardSheet scale={0.62}>
                  <IdCardFront name={employee.name} designation={employee.designation} displayId={employee.displayId} bloodGroup={employee.dossier.bloodGroup} validUntil={issued ? cardDate(issued.expiryDate) : 'On issue'} photo={employee.photo} />
                </IdCardSheet>
              )
              : <div className="rounded-xl border p-5 text-sm text-slate-500">Select an employee to preview the card.</div>}
          </div>
        </CardContent>
      </Card>
    </PortalShell>
  );
}
export default function GenerateIdCardPage() {return <Suspense><GenerateContent /></Suspense>;}
