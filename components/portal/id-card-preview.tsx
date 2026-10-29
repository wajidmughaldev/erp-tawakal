'use client';
import {useEffect, useState} from 'react';
import QRCode from 'qrcode';
import type {IDCard} from '@/lib/contracts';
import {darken, useCardColor} from '@/lib/use-card-color';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 2027-01-09 -> 09 Jan 2027 (string based, so the viewer's time zone never shifts the date). */
export function cardDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day && months[Number(month) - 1] ? `${day} ${months[Number(month) - 1]} ${year}` : value;
}
// Optional line printed on the back of every card, for example the office address and phone number.
const contactLine = process.env.NEXT_PUBLIC_CARD_CONTACT || 'Tawakal Enterprises';

/** Wrapper that sets the scale and the global card colour for the card faces inside it. */
export function IdCardSheet({scale, children}: {scale?: number; children: React.ReactNode}) {
  const {color} = useCardColor();
  const style = {'--idc-indigo': color, '--idc-indigo-dark': darken(color), ...(scale ? {'--idc-scale': scale} : {})} as React.CSSProperties;
  return <div className="idc-sheet" style={style}>{children}</div>;
}

export type CardFrontData = {name: string; designation: string; displayId: string; bloodGroup?: string; validUntil: string; photo?: string};

export function IdCardFront({name, designation, displayId, bloodGroup, validUntil, photo}: CardFrontData) {
  return (
    <div className="idc-frame">
      <div className="idc-card idc-front" data-testid="id-card-front">
        <div className="idc-hole" />
        <div className="idc-band" />
        <div className="idc-brand">
          <img src="/brand/logo-white.svg" alt="Tawakal Enterprises" />
          <div className="idc-kind">EMPLOYEE ID</div>
        </div>
        <div className="idc-photo">
          {photo
            ? <img src={photo} alt="Employee photograph" />
            : <svg viewBox="0 0 100 120" preserveAspectRatio="xMidYMid slice" role="img" aria-label="No photograph"><rect width="100" height="120" fill="#d9d6ea" /><circle cx="50" cy="46" r="20" fill="#9a95bd" /><path d="M12 120c0-26 17-42 38-42s38 16 38 42z" fill="#9a95bd" /></svg>}
        </div>
        <div className="idc-person">
          <div className="idc-name">{name}</div>
          <div className="idc-role">{designation}</div>
          <div className="idc-rule" />
        </div>
        <div className="idc-facts">
          <div><div className="idc-k">Employee ID</div><div className="idc-v idc-mono">{displayId}</div></div>
          <div><div className="idc-k">Blood Group</div><div className="idc-v">{bloodGroup ? <span className="idc-blood">{bloodGroup}</span> : '—'}</div></div>
          <div><div className="idc-k">Valid Until</div><div className="idc-v">{validUntil}</div></div>
        </div>
        <div className="idc-foot"><b>TAWAKAL ENTERPRISES</b><span>Property of the company · Scan the QR on the back to verify</span></div>
      </div>
    </div>
  );
}

function IdCardBack({card, qr}: {card: IDCard; qr: string}) {
  const {employee} = card;
  return (
    <div className="idc-frame">
      <div className="idc-card idc-back" data-testid="id-card-back">
        <div className="idc-hole" />
        <div className="idc-top"><b>VERIFY THIS CARD</b><span>SMART ID CREDENTIAL</span></div>
        <div className="idc-qr">
          <div className="idc-qr-frame">{qr && <img src={qr} alt="Scannable portal verification QR" />}</div>
          <p>Scan to check this card is genuine</p>
          <small>Shows whether the card is valid, expired or revoked</small>
        </div>
        <div className="idc-grid3">
          <div><div className="idc-k">Card No.</div><div className="idc-v idc-mono">{card.number}</div></div>
          <div><div className="idc-k">Issued</div><div className="idc-v">{cardDate(card.issueDate)}</div></div>
          <div><div className="idc-k">Expires</div><div className="idc-v">{cardDate(card.expiryDate)}</div></div>
        </div>
        <div className="idc-rows">
          <div className="idc-row"><span className="idc-k">CNIC</span><span className="idc-v">{employee.cnic || '—'}</span></div>
          <div className="idc-row"><span className="idc-k">Emergency Contact</span><span className="idc-v">{employee.emergencyContact || '—'}</span></div>
        </div>
        <div className="idc-terms">This card is the property of Tawakal Enterprises and must be carried on duty. It is not transferable. If found, please return it to the company.</div>
        <div className="idc-foot"><img src="/brand/logo-white.svg" alt="" /><span>{contactLine}</span></div>
      </div>
    </div>
  );
}

/** Both faces of an issued card; this is also what gets printed (one 54 x 85.6 mm page per face). */
export function IdCardPreview({card}: {card: IDCard}) {
  const {color} = useCardColor();
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    setQr(''); setError('');
    if (!card.verificationToken) {setError('The backend did not provide a verification token.'); return;}
    const url = new URL('/verify', window.location.origin);
    url.searchParams.set('token', card.verificationToken);
    QRCode.toDataURL(url.toString(), {scale: 8, margin: 0, errorCorrectionLevel: 'M', color: {dark: color, light: '#ffffff'}})
      .then(value => {if (current) setQr(value);})
      .catch(() => {if (current) setError('Unable to generate QR preview.');});
    return () => {current = false;};
  }, [card.verificationToken, color]);

  const {employee} = card;
  return (
    <div className="print-cards">
      <IdCardSheet>
        <IdCardFront name={employee.name} designation={employee.designation} displayId={employee.displayId} bloodGroup={employee.bloodGroup} validUntil={cardDate(card.expiryDate)} photo={employee.photo} />
        <IdCardBack card={card} qr={qr} />
      </IdCardSheet>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
