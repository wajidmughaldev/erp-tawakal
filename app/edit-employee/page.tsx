'use client';
import {Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import {PortalShell} from '@/components/portal/portal-shell';
import {EmployeeForm} from '@/components/portal/employee-form';
import {DataState} from '@/components/portal/data-state';
import {employeesApi} from '@/lib/services';
import {useResource} from '@/lib/use-resource';
function EditContent() {
 const id=useSearchParams().get('id')??'';
 const state=useResource(()=>/^[\w-]{1,100}$/.test(id)?employeesApi.get(id):Promise.reject(new Error('Select a valid employee ID.')),[id]);
 return <PortalShell><DataState {...state} retry={state.refetch}/>{state.data?.data&&<EmployeeForm key={id} mode="edit" employee={state.data.data}/>}</PortalShell>;
}
export default function EditEmployeePage(){return <Suspense><EditContent/></Suspense>;}
