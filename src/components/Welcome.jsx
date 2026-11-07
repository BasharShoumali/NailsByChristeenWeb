import React, { useState } from "react";
import { Sheet } from "./ui.jsx";

export default function Welcome({ onClose, onStart, kind, owner }) {
  const [f, setF] = useState({
    ownerName: owner || "",
    salonName: "",
    currency: "ILS",
  });
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    await onStart({
      ...f,
      ownerName: f.ownerName.trim(),
      salonName: f.salonName.trim(),
    });
    setBusy(false);
  };
  return (
    <Sheet
      title="Start your book"
      onClose={onClose}
      footer={
        <>
          <span className="grow" />
          <button className="btn ghost" onClick={onClose}>
            Not yet
          </button>
          <button className="btn primary" disabled={busy} onClick={go}>
            {busy ? "Setting up…" : "Create my book"}
          </button>
        </>
      }
    >
      <div className="form">
        <p className="lead">
          A clean, empty book just for you. We’ll add a starter list of services
          with prices you can change any time.
        </p>
        <div className="field">
          <label htmlFor="w-name">Your name</label>
          <input
            id="w-name"
            value={f.ownerName}
            onChange={(e) => setF({ ...f, ownerName: e.target.value })}
            placeholder="So we can say hello"
          />
        </div>
        <div className="field">
          <label htmlFor="w-salon">Salon name</label>
          <input
            id="w-salon"
            value={f.salonName}
            onChange={(e) => setF({ ...f, salonName: e.target.value })}
            placeholder="e.g. Velvet Nails"
          />
        </div>
        <div className="field">
          <label htmlFor="w-cur">Currency</label>
          <select
            id="w-cur"
            value={f.currency}
            onChange={(e) => setF({ ...f, currency: e.target.value })}
          >
            <option value="ILS">₪ Shekel</option>
            <option value="USD">$ Dollar</option>
            <option value="EUR">€ Euro</option>
            <option value="GBP">£ Pound</option>
            <option value="JOD">JOD Dinar</option>
          </select>
        </div>
        <p className="hint">
          {kind === "api"
            ? "Your book is saved in your salon’s database and stays in sync on your phone, iPad and computer."
            : kind === "cloud"
              ? "Your book is private to your account and stays in sync on your phone, iPad and computer."
              : "Your book is saved in this browser on this device."}
        </p>
      </div>
    </Sheet>
  );
}
