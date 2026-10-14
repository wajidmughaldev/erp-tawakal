'use client';

import Link from 'next/link';
import {useParams} from 'next/navigation';
import {QrCode} from 'lucide-react';
import {PortalShell} from '@/components/portal/portal-shell';
import {PageHeader} from '@/components/portal/page-header';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {badgeTone, cards} from '@/lib/portal-data';

export default function CardDetailPage() {
  const params = useParams<{card: string}>();
  const card = cards.find((item) => item.card === params.card) ?? cards[0];

  return (
    <PortalShell>
      <PageHeader title={card.card} description="Official smart ID credential detail" action={<Button type="button" variant="outline" onClick={() => window.print()}>Print Card</Button>} />
      <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <Card>
          <CardContent>
            <div className="rounded-xl bg-[var(--brand-dark)] p-5 text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Tawakkal Enterprises</span>
                <Badge tone={badgeTone(card.status)}>{card.status}</Badge>
              </div>
              <div className="mt-5 flex gap-4">
                <img src={card.photo} alt="" className="size-24 rounded-lg object-cover" />
                <div>
                  <h2 className="text-xl font-semibold">{card.empName}</h2>
                  <p className="text-sm text-white/70">{card.designation}</p>
                  <p className="mt-3 font-mono text-sm text-[var(--brand-gold)]">{card.card}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-white/75">
                <div>Blood: <strong className="text-white">{card.bloodGroup}</strong></div>
                <div>Expiry: <strong className="text-white">{card.expiryDate}</strong></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {[
              ['Employee ID', card.empId],
              ['Department', card.department],
              ['CNIC', card.nic],
              ['Issued By', card.issuedBy],
              ['Issue Date', card.issueDate],
              ['Security Hash', card.securityHash],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-slate-100 p-3">
                <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
                <div className="mt-1 text-sm">{value}</div>
              </div>
            ))}
            <div className="rounded-md border border-slate-100 p-3 md:col-span-2">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><QrCode size={18} /> Verification URL</div>
              <Link className="break-all text-sm text-[var(--brand-deep)]" href={`/verify?code=${card.card}`}>/verify?code={card.card}</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
