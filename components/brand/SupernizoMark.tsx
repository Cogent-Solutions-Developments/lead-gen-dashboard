import type { SVGProps } from "react";

/**
 * Original Supernizo brand mark. It is intentionally independent from any
 * third-party icon so the product chrome does not inherit another library's
 * visual identity.
 */
export function SupernizoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M24 5.5 39 14v16L24 38.5 9 30V14L24 5.5Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="m16 20.5 8 4.5 8-4.5M24 25v8.5M16 20.5V29l8 4.5M32 20.5V29l-8 4.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="11.5" r="2.5" fill="currentColor" />
    </svg>
  );
}
