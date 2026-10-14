'use client';

import {useState} from 'react';
import Link from 'next/link';
import {PortalShell} from '@/components/portal/portal-shell';
import {PageHeader} from '@/components/portal/page-header';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {cards} from '@/lib/portal-data';

export function CardActionForm({type}: {type: 'renew' | 'reissue'}) {
  const [done, setDone] = useState(false);
  const card = cards[0];
  const isRenew = type === 'renew';

  return (
    <PortalShell>
      <PageHeader title={isRenew ? 'Renew Card' : 'Reissue Card'} description={isRenew ? 'Extend credential validity while preserving holder record.' : 'Deactivate old credential and issue a replacement card.'} />
      <Card>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-slate-50 p-4 text-sm">
            <div className="font-semibold">{card.card} · {card.empName}</div>
            <div className="text-slate-500">{card.designation} · Current expiry {card.expiryDate}</div>
          </div>
          {isRenew ? (
            <label className="block text-sm font-medium text-slate-600">Renewal Type<select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"><option>Renew existing card</option><option>Renew and print new physical card</option></select></label>
          ) : (
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" required /> I acknowledge the previous card will be deactivated.</label>
          )}
          <Button type="button" variant={isRenew ? 'default' : 'danger'} onClick={() => setDone(true)}>{isRenew ? 'Confirm Renewal' : 'Confirm Reissue'}</Button>
          {done ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              {isRenew ? 'Card renewed successfully.' : 'Replacement card issued successfully.'}
              <div className="mt-3 flex gap-2">
                <Link href={`/id-cards/${card.card}`} className="rounded-md bg-emerald-600 px-3 py-2 text-white">View ID Card</Link>
                <button className="rounded-md border border-emerald-300 px-3 py-2" onClick={() => window.print()}>Print Card</button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </PortalShell>
  );
}
