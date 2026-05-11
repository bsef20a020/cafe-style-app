function BearCoffeeLogo({ className = "" }) {
  return (
    <span className={`brand-symbol bear-logo-wrap ${className}`.trim()} aria-hidden="true">
      <svg className="bear-logo" viewBox="0 0 64 64" focusable="false">
        <g className="bear-head">
          <circle cx="17" cy="20" r="9" fill="#8a5f45" />
          <circle cx="47" cy="20" r="9" fill="#8a5f45" />
          <circle cx="17" cy="20" r="4.7" fill="#d9c1a0" />
          <circle cx="47" cy="20" r="4.7" fill="#d9c1a0" />
          <circle cx="32" cy="33" r="21" fill="#9b6b4a" />
          <path d="M15.5 32.2c2.9-9.7 9-14.6 16.5-14.6s13.6 4.9 16.5 14.6c-3.8-3.1-9.6-5-16.5-5s-12.7 1.9-16.5 5Z" fill="#b9825c" opacity=".72" />
          <circle cx="24" cy="31.5" r="3.1" fill="#20231f" />
          <circle cx="40" cy="31.5" r="3.1" fill="#20231f" />
          <circle cx="25.1" cy="30.2" r="1" fill="#fffaf0" />
          <circle cx="41.1" cy="30.2" r="1" fill="#fffaf0" />
          <ellipse cx="32" cy="41" rx="10.6" ry="8" fill="#d9c1a0" />
          <path d="M29 39.1c0-1.4 1.3-2.4 3-2.4s3 1 3 2.4c0 1.2-1.2 2.2-3 2.2s-3-1-3-2.2Z" fill="#3a2a22" />
          <path d="M27.2 43.5c2.2 2 7.4 2 9.6 0" fill="none" stroke="#3a2a22" strokeWidth="2.1" strokeLinecap="round" />
        </g>
        <g className="bear-cup">
          <ellipse cx="36.2" cy="47.8" rx="4.2" ry="3.4" fill="#8a5f45" />
          <path d="M38.4 41.4h10a3 3 0 0 1 3 3v2.8a9.2 9.2 0 0 1-18.4 0v-2.8a3 3 0 0 1 3-3h2.4Z" fill="#fffaf0" />
          <path d="M48.7 44.4h2.3a3.7 3.7 0 0 1 0 7.4h-1.4" fill="none" stroke="#fffaf0" strokeWidth="3.4" strokeLinecap="round" />
          <ellipse cx="42.2" cy="44.6" rx="7.2" ry="2.6" fill="#5f3a24" />
          <path d="M39.1 44.7c1.4-1 4.8-1 6.2 0" fill="none" stroke="#d9c1a0" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M36 50.8c3.5 1.8 9.8 1.8 12.8-.2" fill="none" stroke="#eadfcb" strokeWidth="1.5" strokeLinecap="round" opacity=".8" />
        </g>
        <g className="bear-steam" fill="none" stroke="#f7f4ed" strokeWidth="2" strokeLinecap="round">
          <path className="steam-line steam-one" d="M40.5 36.6c-1.4-1.8.2-3 .2-4.7" />
          <path className="steam-line steam-two" d="M46.2 36.6c-1.4-1.8.2-3 .2-4.7" />
        </g>
      </svg>
    </span>
  );
}

export default BearCoffeeLogo;
