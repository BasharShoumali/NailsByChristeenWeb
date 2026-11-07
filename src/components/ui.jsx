import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { initials, avatarColor, STATUS } from "../lib/util.js";

const PATHS = {
  home: (
    <>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6 10v9h12v-9" />
      <path d="M10 19v-5h4v5" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="3" />
      <path d="M4 10h16M9 3.5v4M15 3.5v4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="9" r="3.2" />
      <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <circle cx="17" cy="8" r="2.4" />
      <path d="M16 13.2c2.4.1 4 1.6 4.5 4.3" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <rect x="5.5" y="11" width="3" height="6" rx="1" />
      <rect x="10.5" y="6" width="3" height="11" rx="1" />
      <rect x="15.5" y="9" width="3" height="8" rx="1" />
    </>
  ),
  bottle: (
    <>
      <rect x="7" y="10" width="10" height="10.5" rx="3" />
      <path d="M10 10V6.5h4V10" />
      <path d="M10.5 6.5 11 3h2l.5 3.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  left: <path d="m14.5 6-6 6 6 6" />,
  right: <path d="m9.5 6 6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 2" />
    </>
  ),
  phone: (
    <path d="M6.5 4h3l1.5 4-2 1.3a10 10 0 0 0 5.7 5.7L16 13l4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4Z" />
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
      <path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" />
    </>
  ),
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  sparkle: (
    <path d="M12 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5Z" />
  ),
  note: (
    <>
      <path d="M6 4h9l3 3v13H6z" />
      <path d="M9 10h6M9 14h6" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11M7 10l5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V4M7 9l5-5 5 5" />
      <path d="M5 20h14" />
    </>
  ),
  repeat: (
    <>
      <path d="M17 3l3 3-3 3" />
      <path d="M4 12V9a3 3 0 0 1 3-3h13" />
      <path d="M7 21l-3-3 3-3" />
      <path d="M20 12v3a3 3 0 0 1-3 3H4" />
    </>
  ),
};

export function Icon({ name, size = 20, stroke = 1.7, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

export function Swatch({ hex, size = 14, className = "" }) {
  return (
    <span
      className={"swatch " + className}
      style={{ "--c": hex, width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export function Avatar({ name, size = 40 }) {
  return (
    <span
      className="avatar"
      style={{
        "--c": avatarColor(name),
        width: size,
        height: size,
        fontSize: size * 0.38,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.booked;
  return <span className={"pill " + s.cls}>{s.label}</span>;
}

export function Sheet({ title, onClose, children, footer, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first =
      ref.current && ref.current.querySelector("input,button,select,textarea");
    if (first && window.matchMedia("(min-width: 700px)").matches) first.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  // Portal to <body> so no animated or transformed parent can trap the fixed overlay (iOS Safari).
  return createPortal(
    <div
      className="sheet-wrap"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={"sheet" + (wide ? " wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
      >
        <div className="sheet-grip" aria-hidden="true" />
        <header className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function Segmented({ value, onChange, options, label }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          className={value === o.id ? "on" : ""}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon = "sparkle", title, children }) {
  return (
    <div className="empty">
      <span className="empty-ico">
        <Icon name={icon} size={22} />
      </span>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}
