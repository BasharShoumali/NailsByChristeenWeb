import React, { useState } from "react";
import { Icon } from "./ui.jsx";

export default function Login({ owner, onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!pw) {
      setErr("Type your password.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await onLogin(pw);
    } catch (x) {
      setErr(x.message);
      setBusy(false);
    }
  };
  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <span className="brand-mark big" aria-hidden="true">
          <Icon name="bottle" size={26} />
        </span>
        <p className="eyebrow">Nails Saloon</p>
        <h1 className="display">Welcome back{owner ? `, ${owner}` : ""}</h1>
        <div className="field">
          <label htmlFor="login-pw">Password</label>
          <input
            id="login-pw"
            type="password"
            autoComplete="current-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
          />
          {err && <p className="err">{err}</p>}
        </div>
        <button className="btn primary block" disabled={busy}>
          {busy ? "Opening…" : "Open my book"}
        </button>
        <p className="hint">
          You’ll stay signed in on this device for 60 days.
        </p>
      </form>
    </div>
  );
}
