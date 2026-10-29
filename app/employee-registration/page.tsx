'use client';
import {Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import {EmployeeForm} from '@/components/portal/employee-form';
import {DataState} from '@/components/portal/data-state';
import {invitesApi} from '@/lib/services';
import {useResource} from '@/lib/use-resource';
import type {InviteValidation} from '@/lib/contracts';
function CandidateContent() {
  const token = useSearchParams().get('token') ?? '';
  const state = useResource<InviteValidation>(() => !token ? Promise.reject(new Error('Missing invitation token. Open the registration link supplied by your administrator.')) : !/^[A-Za-z0-9_-]{43}$/.test(token) ? Promise.resolve({status:'invalid' as const}) : invitesApi.validate(token), [token]);
  const valid = state.data?.status === 'valid' && state.data.invite;
  const messages = {invalid:'This invitation is invalid.', expired:'This invitation has expired. Request a new link.', used:'This invitation has already been used.'};
  return <main className="min-h-screen p-4 lg:p-7"><h1 className="mb-5 text-xl font-semibold">Tawakal Enterprises — Candidate Registration</h1><DataState {...state} retry={state.refetch}/>{state.data && !valid && <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-4">{messages[state.data.status] ?? 'The invitation was not confirmed.'}</p>}{valid && <EmployeeForm key={token} mode="candidate" token={token} permitted={valid}/>}</main>;
}
export default function CandidatePage() {return <Suspense><CandidateContent/></Suspense>;}
