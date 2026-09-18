import type { ReactElement, SVGProps } from "react";

export type IconName =
  | "home"
  | "practice"
  | "plan"
  | "progress"
  | "settings"
  | "exams"
  | "mistakes"
  | "clock"
  | "flame"
  | "trophy"
  | "bolt"
  | "check"
  | "x"
  | "plus"
  | "arrow-prev"
  | "arrow-next"
  | "chevron"
  | "bell"
  | "book"
  | "sparkle"
  | "play"
  | "download"
  | "star"
  | "search"
  | "user"
  | "users";

const PATHS: Record<IconName, ReactElement> = {
  home: (
    <g>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </g>
  ),
  practice: (
    <g>
      <path d="M15.5 4.5 19.5 8.5" />
      <path d="M12 8 16 12" />
      <path d="M4 20l.9-3.1a2 2 0 0 1 .5-.9L16.5 4.9a2.1 2.1 0 0 1 3 0l.6.6a2.1 2.1 0 0 1 0 3L9 19.6a2 2 0 0 1-.9.5L5 21z" />
    </g>
  ),
  plan: (
    <g>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
      <path d="M9 15l2 2 4-4" />
    </g>
  ),
  progress: (
    <g>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 16l3-4 3 2 4-6" />
    </g>
  ),
  settings: (
    <g>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </g>
  ),
  exams: (
    <g>
      <path d="M7 3h7l4 4v14a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 21V4.5A1.5 1.5 0 0 1 7.5 3z" />
      <path d="M14 3v4h4" />
      <path d="M9 13h6M9 17h4" />
    </g>
  ),
  mistakes: (
    <g>
      <path d="M12 2a10 10 0 1 1-9.9 12h11.9" />
      <path d="M12 12l-2.5-2.5" />
      <path d="M4 15.5 2 17.5l3 3 1.5-1.5" />
    </g>
  ),
  clock: (
    <g>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </g>
  ),
  flame: (
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  ),
  trophy: (
    <g>
      <path d="M8 4h8v6a4 4 0 0 1-8 0z" />
      <path d="M8 5H5v2a3 3 0 0 0 4 2.8M16 5h3v2a3 3 0 0 1-4 2.8" />
      <path d="M12 14v3M9 21h6M10 17h4l1 4H9z" />
    </g>
  ),
  bolt: (
    <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
  ),
  check: (
    <path d="m5 12.5 5 5L19.5 7" />
  ),
  x: (
    <path d="M6 6l12 12M18 6 6 18" />
  ),
  plus: (
    <path d="M12 5v14M5 12h14" />
  ),
  "arrow-prev": (
    <path d="M19 12H5M11 6l-6 6 6 6" />
  ),
  "arrow-next": (
    <path d="M5 12h14M13 6l6 6-6 6" />
  ),
  chevron: (
    <path d="m6 9 6 6 6-6" />
  ),
  bell: (
    <g>
      <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 7H4c0-1 2-2 2-7z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </g>
  ),
  book: (
    <g>
      <path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z" />
      <path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z" />
    </g>
  ),
  sparkle: (
    <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" />
  ),
  play: (
    <path d="M7 5l12 7-12 7z" />
  ),
  download: (
    <g>
      <path d="M12 4v11M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </g>
  ),
  star: (
    <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.5 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" />
  ),
  search: (
    <g>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </g>
  ),
  user: (
    <g>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </g>
  ),
  users: (
    <g>
      <circle cx="9" cy="9" r="3.5" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16 6a3 3 0 0 1 0 6M17.5 14.6c2 .7 3.5 2.4 3.5 5.4" />
    </g>
  ),
};

export function Icon({
  name,
  size = 20,
  ...props
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}