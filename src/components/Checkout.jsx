import React, { useState } from 'react';
import { useBook } from '../App.jsx';
import { Sheet, Segmented, Avatar, Icon } from './ui.jsx';
import { PAYMENTS, fmtLong } from '../lib/util.js';

export default function Checkout({ appt, onClose }) {
  const { services, actions, money } = useBook();
  const [price, setPrice] = useState(appt.price ?? 0);
  const [tip, setTip] = useState('');
  const [payment, setPayment] = useState('cash');
  const names = (appt.serviceIds || []).map((id) => services[id]?.name).filter(Boolean).join(' + ') || 'Appointment';
  const total = (Number(price) || 0) + (Number(tip) || 0);
  const pay = async () => {
    const ok = await actions.saveAppt({ ...appt, price: Number(price) || 0, tip: Number(tip) || 0, payment, status: 'done' }, `${money(total)} added to today`);
    if (ok) onClose();
  };
  const noShow = async () => { if (await actions.saveAppt({ ...appt, status: 'noshow', payment: '', tip: 0 }, 'Marked as no-show')) onClose(); };
  return (
    <Sheet title="Check out" onClose={onClose}
      footer={<>
        <button className="btn ghost" onClick={noShow}>Didn’t come</button>
        <span className="grow" />
        <button className="btn primary" onClick={pay}><Icon name="check" size={18} />Paid {money(total)}</button>
      </>}>
      <div className="form">
        <div className="chosen-client">
          <Avatar name={appt.clientName} size={40} />
          <div><strong>{appt.clientName}</strong><small>{names} · {fmtLong(appt.date)}, {appt.start}</small></div>
        </div>
        <div className="grid2">
          <div className="field"><label htmlFor="co-price">Price</label>
            <input id="co-price" type="number" inputMode="decimal" min="0" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div className="field"><label htmlFor="co-tip">Tip</label>
            <input id="co-tip" type="number" inputMode="decimal" min="0" value={tip} placeholder="0" onChange={(e) => setTip(e.target.value)} /></div>
        </div>
        <div className="field"><label>Paid with</label>
          <Segmented value={payment} onChange={setPayment} options={PAYMENTS} label="Payment method" /></div>
        <div className="checkout-total"><span>Total</span><strong className="num-display">{money(total)}</strong></div>
      </div>
    </Sheet>
  );
}
