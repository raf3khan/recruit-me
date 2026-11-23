/** Line icons from the prototype. Direction icons (chev, back, arrow, send, out) flip in RTL via .ico-dir. */
const PATHS = {
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  jobs: (<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5h6v2M3 12h18" /></>),
  apps: (<><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="4" cy="6" r=".6" fill="currentColor" /><circle cx="4" cy="12" r=".6" fill="currentColor" /><circle cx="4" cy="18" r=".6" fill="currentColor" /></>),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>),
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  gear: (<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></>),
  chev: <path d="M9 5l7 7-7 7" />,
  back: <path d="M15 5l-7 7 7 7" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  lock: (<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  upload: <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />,
  mail: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>),
  doc: (<><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></>),
  ext: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  bell: (<><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></>),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  out: <path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" />,
  card: (<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>),
} as const;

const DIRECTIONAL = new Set(["chev", "back", "arrow", "out", "send"]);

export type IconName = keyof typeof PATHS | "send";

export function Icon({ name }: { name: IconName }) {
  const cls = `ico${DIRECTIONAL.has(name) ? " ico-dir" : ""}`;
  if (name === "send")
    return (
      <svg className={cls} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12l16-8-6 16-2.5-6.5z" fill="currentColor" />
      </svg>
    );
  return (
    <svg className={cls} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </svg>
  );
}
