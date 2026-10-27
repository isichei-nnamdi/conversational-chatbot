import React from "react";

const P = {
  book: "M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zm0 14a2 2 0 012-2h13",
  building: "M5 21V4h9v17M14 9h5v12M8 8h3M8 12h3M8 16h3M3 21h18",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  chart: "M4 20V4M4 20h16M8 16v-5M13 16V8M18 16v-3",
  file: "M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h6",
  help: "M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1-1.5 2M12 17h.01",
  mail: "M3 6h18v12H3zM3 7l9 7 9-7",
  mic: "M12 3a3 3 0 013 3v5a3 3 0 01-6 0V6a3 3 0 013-3zM6 11a6 6 0 0012 0M12 17v4",
  notebook: "M6 3h12v18H6zM9 3v18M12 8h4M12 12h4",
  route: "M6 19a2 2 0 100-4 2 2 0 000 4zM18 9a2 2 0 100-4 2 2 0 000 4zM8 17h6a3 3 0 000-6h-4a3 3 0 010-6h6",
  stamp: "M9 4h6v6l3 4H6l3-4zM5 20h14",
  upload: "M12 16V4M7 9l5-5 5 5M4 20h16",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  video: "M3 6h12v12H3zM15 10l6-3v10l-6-3",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
  sun: "M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5",
  moon: "M20 14A8 8 0 019.5 4 8 8 0 1020 14z",
  chat: "M4 5h16v11H10l-4 4v-4H4zM8 10h8",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
};

export function Icon({ name }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] || P.help} />
    </svg>
  );
}
