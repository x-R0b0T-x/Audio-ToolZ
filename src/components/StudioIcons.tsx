import React from 'react';

interface IconProps {
  className?: string;
}

const baseSvgProps: React.SVGProps<SVGSVGElement> = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const IconOpen: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    <path
      d="M3 6.5C3 5.4 3.9 4.5 5 4.5H9.2L11 6.5H19C20.1 6.5 21 7.4 21 8.5V10H4.5L3 18.5V6.5Z"
      fill="var(--icon-fill)"
      stroke="var(--icon-stroke)"
      strokeWidth={1.7}
    />
    <path
      d="M4.5 10H21L19.1 18.2C18.9 19 18.2 19.5 17.3 19.5H4.3C3.5 19.5 2.9 18.8 3.1 18L4.5 10Z"
      fill="var(--icon-fill)"
      stroke="var(--icon-stroke)"
      strokeWidth={1.7}
    />
    <path
      d="M9.5 14.8V13.8M12 16V12.6M14.5 15.2V13.4"
      stroke="var(--icon-highlight)"
      strokeWidth={1.8}
    />
  </svg>
);

export const IconNew: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    <path
      d="M6 3.5H13.8L18 7.7V19C18 19.8 17.3 20.5 16.5 20.5H7.5C6.7 20.5 6 19.8 6 19V5C6 4.2 6.7 3.5 6 3.5Z"
      fill="var(--icon-fill)"
      stroke="var(--icon-stroke)"
      strokeWidth={1.7}
    />
    <path d="M13.8 3.5V7.8H18" stroke="var(--icon-stroke)" strokeWidth={1.6} />
    <path
      d="M12 11.5V16.5M9.5 14H14.5"
      stroke="var(--icon-highlight)"
      strokeWidth={1.9}
    />
  </svg>
);

export const IconUndo: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    <path
      d="M8.5 6.5L4 10.5L8.5 14.5"
      stroke="var(--icon-highlight)"
      strokeWidth={2}
    />
    <path
      d="M4.5 10.5H14C17.3 10.5 19.8 12.8 19.8 15.8C19.8 18.1 18.1 19.8 15.5 19.8H11.5"
      stroke="var(--icon-stroke)"
      strokeWidth={1.8}
    />
  </svg>
);

export const IconRedo: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    <path
      d="M15.5 6.5L20 10.5L15.5 14.5"
      stroke="var(--icon-highlight)"
      strokeWidth={2}
    />
    <path
      d="M19.5 10.5H10C6.7 10.5 4.2 12.8 4.2 15.8C4.2 18.1 5.9 19.8 8.5 19.8H12.5"
      stroke="var(--icon-stroke)"
      strokeWidth={1.8}
    />
  </svg>
);

export const IconCut: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    <circle
      cx="6.5"
      cy="7"
      r="2.6"
      fill="var(--icon-fill)"
      stroke="var(--icon-stroke)"
      strokeWidth={1.7}
    />
    <circle
      cx="6.5"
      cy="17"
      r="2.6"
      fill="var(--icon-fill)"
      stroke="var(--icon-stroke)"
      strokeWidth={1.7}
    />
    <path
      d="M8.7 8.4L19.5 17.5M8.7 15.6L19.5 6.5"
      stroke="var(--icon-highlight)"
      strokeWidth={1.9}
    />
  </svg>
);

export const IconCopy: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    <rect
      x="8.5"
      y="8.5"
      width="11"
      height="12"
      rx="2"
      fill="var(--icon-fill)"
      stroke="var(--icon-stroke)"
      strokeWidth={1.7}
    />
    <path
      d="M15.5 8.5V5.5C15.5 4.4 14.6 3.5 13.5 3.5H6C4.9 3.5 4 4.4 4 5.5V14.5C4 15.6 4.9 16.5 6 16.5H8.5"
      stroke="var(--icon-stroke)"
      strokeWidth={1.7}
    />
    <path
      d="M11.5 12.5H16.5M11.5 15.5H15.2"
      stroke="var(--icon-highlight)"
      strokeWidth={1.7}
    />
  </svg>
);

export const IconPaste: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    <rect
      x="5"
      y="5"
      width="14"
      height="16"
      rx="2.2"
      fill="var(--icon-fill)"
      stroke="var(--icon-stroke)"
      strokeWidth={1.7}
    />
    <rect
      x="8.5"
      y="3"
      width="7"
      height="3.5"
      rx="1.2"
      fill="var(--bg-canvas)"
      stroke="var(--icon-highlight)"
      strokeWidth={1.6}
    />
    <path
      d="M12 10V16M9.5 13.8L12 16.3L14.5 13.8"
      stroke="var(--icon-highlight)"
      strokeWidth={1.8}
    />
  </svg>
);

export const IconSilence: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    <path
      d="M3.5 9.5H7L11.5 5.5V18.5L7 14.5H3.5C2.9 14.5 2.5 14.1 2.5 13.5V10.5C2.5 9.9 2.9 9.5 3.5 9.5Z"
      fill="var(--icon-fill)"
      stroke="var(--icon-stroke)"
      strokeWidth={1.7}
    />
    <path
      d="M15.2 9.2L20.5 14.8M20.5 9.2L15.2 14.8"
      stroke="var(--icon-highlight)"
      strokeWidth={2}
    />
  </svg>
);

export const IconTrimSelection: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    {/* Inward crop arrows showing left & right removed */}
    <path
      d="M2.5 9.5L5.2 12L2.5 14.5M21.5 9.5L18.8 12L21.5 14.5"
      stroke="var(--icon-accent)"
      strokeWidth={1.8}
    />
    {/* Highlighted central kept selection frame */}
    <rect
      x="7"
      y="5"
      width="10"
      height="14"
      rx="1.8"
      fill="var(--icon-fill)"
      stroke="var(--icon-highlight)"
      strokeWidth={1.8}
    />
    {/* Inner kept audio waveform */}
    <path
      d="M9.6 10.2V13.8M12 7.8V16.2M14.4 9.8V14.2"
      stroke="var(--icon-highlight)"
      strokeWidth={1.9}
    />
  </svg>
);

export const IconZoomIn: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    <circle
      cx="10.5"
      cy="10.5"
      r="6.2"
      fill="var(--icon-fill)"
      stroke="var(--icon-stroke)"
      strokeWidth={1.7}
    />
    <path d="M15.2 15.2L20 20" stroke="var(--icon-stroke)" strokeWidth={2} />
    <path
      d="M10.5 7.8V13.2M7.8 10.5H13.2"
      stroke="var(--icon-highlight)"
      strokeWidth={1.9}
    />
  </svg>
);

export const IconZoomOut: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    <circle
      cx="10.5"
      cy="10.5"
      r="6.2"
      fill="var(--icon-fill)"
      stroke="var(--icon-stroke)"
      strokeWidth={1.7}
    />
    <path d="M15.2 15.2L20 20" stroke="var(--icon-stroke)" strokeWidth={2} />
    <path d="M7.8 10.5H13.2" stroke="var(--icon-highlight)" strokeWidth={1.9} />
  </svg>
);

export const IconZoomFit: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    <path
      d="M3.5 5.5V18.5M20.5 5.5V18.5"
      stroke="var(--icon-stroke)"
      strokeWidth={1.8}
    />
    <path
      d="M9 9L6 12L9 15M15 9L18 12L15 15M6.5 12H17.5"
      stroke="var(--icon-highlight)"
      strokeWidth={1.8}
    />
  </svg>
);

export const IconZoomSelection: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    <circle
      cx="10.5"
      cy="10.5"
      r="6.2"
      fill="var(--icon-fill)"
      stroke="var(--icon-stroke)"
      strokeWidth={1.7}
    />
    <path d="M15.2 15.2L20 20" stroke="var(--icon-stroke)" strokeWidth={2} />
    <path
      d="M8.5 8.2H7.4V12.8H8.5M12.5 8.2H13.6V12.8H12.5"
      stroke="var(--icon-highlight)"
      strokeWidth={1.7}
    />
    <rect
      x="9.5"
      y="9.2"
      width="2"
      height="2.6"
      fill="var(--icon-highlight)"
    />
  </svg>
);

export const IconVolume: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    <path
      d="M4 9.5H7.5L12 5.5V18.5L7.5 14.5H4C3.4 14.5 3 14.1 3 13.5V10.5C3 9.9 3.4 9.5 4 9.5Z"
      fill="var(--icon-fill)"
      stroke="var(--icon-stroke)"
      strokeWidth={1.7}
    />
    <path
      d="M15.4 8.8C16.5 9.8 17 10.9 17 12C17 13.1 16.5 14.2 15.4 15.2"
      stroke="var(--icon-highlight)"
      strokeWidth={1.8}
    />
    <path
      d="M18.2 6.2C19.9 7.9 20.8 9.9 20.8 12C20.8 14.1 19.9 16.1 18.2 17.8"
      stroke="var(--icon-accent)"
      strokeWidth={1.8}
    />
  </svg>
);

export const IconNormalize: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    <path
      d="M3.5 5H20.5"
      stroke="var(--icon-highlight)"
      strokeWidth={1.8}
      strokeDasharray="2.5 2"
    />
    <rect
      x="4.5"
      y="8"
      width="3"
      height="11.5"
      rx="1"
      fill="var(--icon-fill)"
      stroke="var(--icon-stroke)"
      strokeWidth={1.5}
    />
    <rect
      x="10.5"
      y="8"
      width="3"
      height="11.5"
      rx="1"
      fill="var(--icon-accent)"
      stroke="var(--icon-highlight)"
      strokeWidth={1.5}
    />
    <rect
      x="16.5"
      y="8"
      width="3"
      height="11.5"
      rx="1"
      fill="var(--icon-fill)"
      stroke="var(--icon-stroke)"
      strokeWidth={1.5}
    />
  </svg>
);

export const IconFade: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    <path
      d="M3.5 18.5C7 18.5 9.5 14.8 12 6.5C14.5 14.8 17 18.5 20.5 18.5H3.5Z"
      fill="var(--icon-fill)"
    />
    <path
      d="M3.5 18.5C7.2 18.5 9.5 14.8 12 6.5C14.5 14.8 16.8 18.5 20.5 18.5"
      stroke="var(--icon-highlight)"
      strokeWidth={2}
    />
    <path
      d="M3.5 18.5H20.5"
      stroke="var(--icon-stroke)"
      strokeWidth={1.5}
      opacity={0.75}
    />
  </svg>
);

export const IconSpeedPitch: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    <path
      d="M4 16.5A8.5 8.5 0 1 1 20 16.5"
      fill="var(--icon-fill)"
      stroke="var(--icon-stroke)"
      strokeWidth={1.7}
    />
    <path
      d="M12 14.2L16.2 8.8"
      stroke="var(--icon-highlight)"
      strokeWidth={2}
    />
    <circle
      cx="12"
      cy="14.2"
      r="1.9"
      fill="var(--icon-accent)"
      stroke="var(--icon-highlight)"
      strokeWidth={1.4}
    />
    <path
      d="M8.5 17.5L10.5 19L8.5 20.5M13.5 17.5L15.5 19L13.5 20.5"
      stroke="var(--icon-accent)"
      strokeWidth={1.6}
    />
  </svg>
);

export const IconControlPanel: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    <rect
      x="3.5"
      y="4.5"
      width="17"
      height="15"
      rx="2.4"
      fill="var(--icon-fill)"
      stroke="var(--icon-stroke)"
      strokeWidth={1.7}
    />
    {/* Mini slider lines + VU bar inside floating console */}
    <path
      d="M7 9H17M7 13H17"
      stroke="var(--icon-stroke)"
      strokeWidth={1.5}
    />
    <circle
      cx="10"
      cy="9"
      r="1.4"
      fill="var(--icon-highlight)"
      stroke="var(--icon-highlight)"
      strokeWidth={1}
    />
    <circle
      cx="14.5"
      cy="13"
      r="1.4"
      fill="var(--icon-highlight)"
      stroke="var(--icon-highlight)"
      strokeWidth={1}
    />
    <path
      d="M7 16.5H17"
      stroke="var(--icon-accent)"
      strokeWidth={2}
    />
  </svg>
);

export const IconExport: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    <path
      d="M12 4V14.5M8 11L12 15L16 11"
      stroke="currentColor"
      strokeWidth={2}
    />
    <path
      d="M5 17.5V19C5 19.6 5.4 20 6 20H18C18.6 20 19 19.6 19 19V17.5"
      stroke="currentColor"
      strokeWidth={1.9}
    />
  </svg>
);

export const IconHelp: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    <circle
      cx="12"
      cy="12"
      r="8.5"
      fill="var(--icon-fill)"
      stroke="var(--icon-stroke)"
      strokeWidth={1.7}
    />
    <path
      d="M9.6 9.4C9.9 8.1 10.9 7.4 12.1 7.4C13.5 7.4 14.5 8.2 14.5 9.4C14.5 10.4 13.8 11 12.7 11.6C12.2 11.9 12 12.3 12 13V13.4"
      stroke="var(--icon-highlight)"
      strokeWidth={1.8}
    />
    <circle cx="12" cy="16.5" r="0.9" fill="var(--icon-highlight)" />
  </svg>
);

export const IconBpm: React.FC<IconProps> = ({ className }) => (
  <svg {...baseSvgProps} className={className}>
    {/* Metronome / Kick-Grid Pulse */}
    <path
      d="M6.5 19.5L9.8 4.8C10 4 10.7 3.5 11.5 3.5H12.5C13.3 3.5 14 4 14.2 4.8L17.5 19.5C17.7 20.1 17.2 20.5 16.6 20.5H7.4C6.8 20.5 6.3 20.1 6.5 19.5Z"
      fill="var(--icon-fill)"
      stroke="var(--icon-stroke)"
      strokeWidth={1.7}
    />
    <path
      d="M12 16.5L17.2 7.5"
      stroke="var(--icon-highlight)"
      strokeWidth={1.9}
    />
    <circle
      cx="15.3"
      cy="10.8"
      r="1.4"
      fill="var(--icon-accent)"
      stroke="var(--icon-highlight)"
      strokeWidth={1.2}
    />
    <path d="M8.5 16.5H15.5" stroke="var(--icon-accent)" strokeWidth={1.5} />
  </svg>
);

