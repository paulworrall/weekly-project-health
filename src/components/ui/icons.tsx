/** Inline SVG icons (no icon package, tech stack §5). Decorative unless given a title. */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </Svg>
);
export const ChevronDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);
export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);
export const ArrowRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
export const PencilIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16v4z" />
  </Svg>
);
/** Archive (the UI never hard-deletes). */
export const ArchiveIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 5h18v4H3zM5 9v10h14V9M10 13h4" />
  </Svg>
);
export const LockIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="9" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </Svg>
);
export const PinIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 17v5M8 3h8l-1 7 3 3H6l3-3-1-7z" />
  </Svg>
);
export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const SparkleIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
  </Svg>
);
/** Blocker issue marker: square with a cross. */
export const BlockerIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" />
    <path d="M9 9l6 6M15 9l-6 6" />
  </Svg>
);
export const TriangleUpIcon = ({ size = 14, ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true" focusable="false" {...p}>
    <path d="M11 2l9 16H2z" fill="currentColor" />
  </svg>
);
export const TriangleDownIcon = ({ size = 14, ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true" focusable="false" {...p}>
    <path d="M11 20L2 4h18z" fill="currentColor" />
  </svg>
);
