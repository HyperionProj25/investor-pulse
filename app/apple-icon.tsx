import { ImageResponse } from 'next/og';

// Image metadata
export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

// Image generation
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: '#0A0A0A',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Baseline logo - larger version for Apple icon */}
        <svg width="180" height="180" viewBox="0 0 100 100">
          {/* Pentagon frame with complete top */}
          <path
            d="M80,20 L80,50 L50,70 L20,50 L20,20 L80,20"
            fill="none"
            stroke="#f6e1bd"
            strokeWidth="2.5"
          />

          {/* Corner nodes */}
          <circle cx="20" cy="20" r="3.5" fill="#f6e1bd" />
          <circle cx="80" cy="20" r="3.5" fill="#f6e1bd" />
          <circle cx="20" cy="50" r="3.5" fill="#f6e1bd" />
          <circle cx="80" cy="50" r="3.5" fill="#f6e1bd" />
          <circle cx="50" cy="70" r="3.5" fill="#f6e1bd" />

          {/* Orange baseline bars - varying heights */}
          <line x1="30" y1="26" x2="30" y2="51" stroke="#cb6b1e" strokeWidth="2.5" />
          <line x1="40" y1="32" x2="40" y2="57" stroke="#cb6b1e" strokeWidth="2.5" />
          <line x1="50" y1="36" x2="50" y2="61" stroke="#cb6b1e" strokeWidth="2.5" />
          <line x1="60" y1="32" x2="60" y2="57" stroke="#cb6b1e" strokeWidth="2.5" />
          <line x1="70" y1="26" x2="70" y2="51" stroke="#cb6b1e" strokeWidth="2.5" />

          {/* Bar endpoints */}
          <circle cx="30" cy="51" r="3" fill="#cb6b1e" />
          <circle cx="40" cy="57" r="3" fill="#cb6b1e" />
          <circle cx="50" cy="61" r="3" fill="#cb6b1e" />
          <circle cx="60" cy="57" r="3" fill="#cb6b1e" />
          <circle cx="70" cy="51" r="3" fill="#cb6b1e" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
