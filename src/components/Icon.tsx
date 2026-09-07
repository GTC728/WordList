export type IconName =
  | 'course'
  | 'bank'
  | 'drill'
  | 'settings'
  | 'book'
  | 'cards'
  | 'infinity'
  | 'cloud'
  | 'device'
  | 'copy'
  | 'play'
  | 'lock'
  | 'speaker'
  | 'chevronLeft'
  | 'chevronRight'
  | 'clock'
  | 'warning'
  | 'download'
  | 'upload'
  | 'plus'
  | 'x'
  | 'star'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'mail'

const svg = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
}

function glyph(name: IconName) {
  switch (name) {
    case 'course':
      return (
        <>
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </>
      )
    case 'bank':
      return (
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </>
      )
    case 'drill':
      return (
        <>
          <path d="M3 12a9 9 0 0 1 15.4-6.4L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-15.4 6.4L3 16" />
          <path d="M3 21v-5h5" />
        </>
      )
    case 'settings':
      return (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </>
      )
    case 'book':
      return (
        <>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
          <path d="M4 5.5v16" />
          <path d="M8 8h8M8 12h5" />
        </>
      )
    case 'cards':
      return (
        <>
          <rect x="7" y="7" width="12" height="13" rx="1.5" />
          <path d="M5 18V6.5A1.5 1.5 0 0 1 6.5 5H17" />
        </>
      )
    case 'infinity':
      return <path d="M6 16c5 0 7-8 12-8a4 4 0 0 1 0 8c-5 0-7-8-12-8a4 4 0 1 0 0 8" />
    case 'cloud':
      return <path d="M7 18h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.4 1.6A3.5 3.5 0 0 0 7 18Z" />
    case 'device':
      return (
        <>
          <rect x="8" y="3" width="8" height="18" rx="2" />
          <path d="M11 17h2" />
        </>
      )
    case 'copy':
      return (
        <>
          <rect x="8" y="8" width="11" height="11" rx="2" />
          <path d="M5 15V6a1 1 0 0 1 1-1h9" />
        </>
      )
    case 'play':
      return <path d="M9 7.5v9l8-4.5z" fill="currentColor" stroke="none" />
    case 'lock':
      return (
        <>
          <rect x="6" y="11" width="12" height="9" rx="2" />
          <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
        </>
      )
    case 'speaker':
      return (
        <>
          <path d="M4 10v4h3l4 3V7L7 10H4z" />
          <path d="M16 9.5a3.5 3.5 0 0 1 0 5" />
        </>
      )
    case 'chevronLeft':
      return <path d="M14 6l-6 6 6 6" />
    case 'chevronRight':
      return <path d="M10 6l6 6-6 6" />
    case 'clock':
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l3 2" />
        </>
      )
    case 'warning':
      return (
        <>
          <path d="M12 4 3.5 19h17L12 4z" />
          <path d="M12 10v4M12 16.5h.01" />
        </>
      )
    case 'download':
      return (
        <>
          <path d="M12 4v11" />
          <path d="M7 11l5 5 5-5" />
          <path d="M5 19h14" />
        </>
      )
    case 'upload':
      return (
        <>
          <path d="M12 20V9" />
          <path d="M7 13l5-5 5 5" />
          <path d="M5 5h14" />
        </>
      )
    case 'plus':
      return (
        <>
          <rect x="5" y="5" width="14" height="14" rx="3" />
          <path d="M12 9v6M9 12h6" />
        </>
      )
    case 'x':
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M9 9l6 6M15 9l-6 6" />
        </>
      )
    case 'star':
      return (
        <path
          d="M12 3.6 14.5 9l6 .5-4.6 3.9 1.4 5.8L12 16.8 6.7 19.2l1.4-5.8L3.5 9.5l6-.5L12 3.6Z"
          fill="currentColor"
          stroke="none"
        />
      )
    case 'sun':
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </>
      )
    case 'moon':
      return <path d="M20 14.5A7.5 7.5 0 1 1 9.5 4 6 6 0 0 0 20 14.5z" />
    case 'monitor':
      return (
        <>
          <rect x="3" y="5" width="18" height="12" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </>
      )
    case 'mail':
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 7 9-7" />
        </>
      )
  }
}

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={['icon', className].filter(Boolean).join(' ')} {...svg}>
      {glyph(name)}
    </svg>
  )
}
