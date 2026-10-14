'use client';

import {useState} from 'react';
import {PortalShell} from '@/components/portal/portal-shell';
import {PageHeader} from '@/components/portal/page-header';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {employees} from '@/lib/portal-data';

export default function GenerateIdCardPage() {
  const [employeeId, setEmployeeId] = useState(employees[0].id);
  const [generated, setGenerated] = useState(false);
  const employee = employees.find((item) => item.id === employeeId) ?? employees[0];

  return (
    <PortalShell>
      <PageHeader title="Generate ID Card" description="Select an employee and issue a smart credential." />
      <Card>
        <CardContent className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-600">Employee<select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>{employees.map((item) => <option key={item.id} value={item.id}>{item.id} - {item.name}</option>)}</select></label>
            <label className="block text-sm font-medium text-slate-600">Card Validity<select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"><option>1 Year</option><option>2 Years</option></select></label>
            <Button type="button" onClick={() => setGenerated(true)}>Generate Card</Button>
            {generated ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Card generated successfully. QR token and printable card preview are ready.</div> : null}
          </div>
          <div className="rounded-xl bg-[var(--brand-dark)] p-5 text-white">
            <div className="flex justify-between"><span className="font-semibold">Tawakkal Enterprises</span><Badge tone="success">Preview</Badge></div>
            <img src={employee.photo} alt="" className="mt-5 size-24 rounded-lg object-cover" />
            <h2 className="mt-4 text-xl font-semibold">{employee.name}</h2>
            <p className="text-sm text-white/70">{employee.designation}</p>
            <p className="mt-4 font-mono text-[var(--brand-gold)]">{employee.cardNumber ?? 'CARD-NEW'}</p>
          </div>
        </CardContent>
      </Card>
    </PortalShell>
  );
}
