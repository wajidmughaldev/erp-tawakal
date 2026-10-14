'use client';

import {useSearchParams} from 'next/navigation';
import {Suspense, useEffect, useState} from 'react';
import Link from 'next/link';
import {AlertTriangle, CheckCircle, Printer, QrCode, Search} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {badgeTone, verifyCredential} from '@/lib/portal-data';

function VerifyContent() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get('code') ?? 'CARD-00421');
  const [result, setResult] = useState(() => verifyCredential(query));

  function run(code = query) {
    setQuery(code);
    setResult(verifyCredential(code));
    window.history.replaceState(null, '', `/verify?code=${encodeURIComponent(code)}`);
  }

  useEffect(() => {
    run(params.get('code') ?? 'CARD-00421');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ok = result.success && result.card;

  return (
    <main className="min-h-screen bg-slate-50 p-4 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Credential Verification</h1>
            <p className="text-sm text-slate-500">Public QR and manual card validation portal.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}><Printer size={16} /> Print</Button>
            <Link href="/login" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium">Admin Login</Link>
          </div>
        </div>

        <section className={`rounded-lg border p-5 ${ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-start gap-3">
            {ok ? <CheckCircle className="text-emerald-600" size={28} /> : <AlertTriangle className="text-red-600" size={28} />}
            <div>
              <h2 className="text-xl font-semibold">{ok ? 'Official Credential Verified' : 'Credential Not Verified'}</h2>
              <p className="text-sm text-slate-600">{result.message}</p>
            </div>
          </div>
        </section>

        <form className="mt-5 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row" onSubmit={(event) => { event.preventDefault(); run(); }}>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter card number, employee ID, CNIC, or token" />
          <Button><Search size={16} /> Verify</Button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {['CARD-00421', 'CARD-00403', 'CARD-00360', 'CARD-00375'].map((code) => <Button key={code} type="button" variant="outline" className="h-8 px-2" onClick={() => run(code)}>{code}</Button>)}
        </div>

        {ok ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[320px_1fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-5 text-center">
              <img src={result.card.photo} alt="" className="mx-auto size-28 rounded-full object-cover" />
              <h2 className="mt-4 text-xl font-semibold">{result.card.empName}</h2>
              <p className="text-sm text-slate-500">{result.card.designation}</p>
              <Badge className="mt-3" tone={badgeTone(result.verificationStatus)}>{result.verificationStatus}</Badge>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2 font-semibold"><QrCode size={18} /> Card Details</div>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ['Card Number', result.card.card],
                  ['Employee ID', result.card.empId],
                  ['Department', result.card.department],
                  ['CNIC', result.card.nic],
                  ['Issue Date', result.card.issueDate],
                  ['Expiry Date', result.card.expiryDate],
                  ['QR Status', result.card.qrStatus],
                  ['Security Hash', result.card.securityHash],
                ].map(([label, value]) => <div key={label} className="rounded-md bg-slate-50 p-3"><div className="text-xs text-slate-500">{label}</div><div className="text-sm font-medium">{value}</div></div>)}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return <Suspense><VerifyContent /></Suspense>;
}
