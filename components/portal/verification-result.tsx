import type {PublicVerification} from '@/lib/contracts';
import {daysToExpiry} from '@/lib/contracts';
import {cardDate} from './id-card-preview';

const banner: Record<PublicVerification['status'], {title: string; tone: string}> = {
  valid: {title: 'Valid Card', tone: 'border-emerald-300 bg-emerald-50 text-emerald-900'},
  expiring: {title: 'Valid Card - Expiring Soon', tone: 'border-amber-300 bg-amber-50 text-amber-900'},
  expired: {title: 'Card Expired', tone: 'border-red-300 bg-red-50 text-red-900'},
  revoked: {title: 'Card Not Active', tone: 'border-red-300 bg-red-50 text-red-900'},
  invalid: {title: 'Card Not Recognised', tone: 'border-slate-300 bg-slate-100 text-slate-800'},
};

export function VerificationResult({result}: {result: PublicVerification}) {
  const {title, tone} = banner[result.status] ?? banner.invalid;
  const card = result.card;
  const days = card ? daysToExpiry(card.expiryDate) : null;
  const remaining = days === null ? '—' : days < 0 ? `Expired ${Math.abs(days)} day(s) ago` : days === 0 ? 'Expires today' : `${days} day(s) left`;
  const details: [string, string][] = card ? [
    ['Card Number', card.number],
    ['Employee ID', card.employeeDisplayId],
    ['Designation', card.designation],
    ['Blood Group', card.bloodGroup || '—'],
    ['Issue Date', cardDate(card.issueDate)],
    ['Expiry Date', cardDate(card.expiryDate)],
  ] : [];
  return (
    <>
      <section role="status" className={`mt-5 rounded-lg border p-5 ${tone}`}>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm opacity-90">{result.message}</p>
        <strong className="mt-2 block text-sm capitalize">{result.status}</strong>
      </section>
      {card && (
        <div className="mt-5 grid gap-5 lg:grid-cols-[320px_1fr]">
          <div className="rounded-lg border bg-white p-5 text-center">
            {card.photo
              ? <img src={card.photo} alt="Card holder" className="mx-auto h-44 w-36 rounded-2xl object-cover" />
              : <div className="mx-auto grid h-44 w-36 place-items-center rounded-2xl bg-slate-200 text-sm text-slate-500">No photo</div>}
            <h2 className="mt-4 text-xl font-semibold">{card.employeeName}</h2>
            <p className="text-sm text-slate-500">{card.designation}</p>
            <p className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">{remaining}</p>
          </div>
          <div className="grid gap-3 rounded-lg border bg-white p-5 md:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">{label}</div>
                <div className="text-sm font-medium">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
