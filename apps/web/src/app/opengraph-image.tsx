import { ImageResponse } from 'next/og';

export const alt = 'bagg | send. chase. get paid.';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#FFF8EE',
          padding: '64px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 88,
              height: 88,
              borderRadius: 999,
              background: '#FF7A1A',
              border: '4px dashed #3A1F0A',
              color: '#3A1F0A',
              fontSize: 56,
              fontWeight: 800,
            }}
          >
            b
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
            <div style={{ fontSize: 52, fontWeight: 800, color: '#3A1F0A', lineHeight: 1 }}>bagg</div>
            <div
              style={{
                width: 56,
                height: 6,
                borderRadius: 999,
                background: '#FF4F8B',
                marginTop: 8,
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 78,
              fontWeight: 800,
              color: '#3A1F0A',
              letterSpacing: '-2px',
              lineHeight: 1.04,
            }}
          >
            send. chase.
          </div>
          <div
            style={{
              fontSize: 78,
              fontWeight: 800,
              color: '#3A1F0A',
              letterSpacing: '-2px',
              lineHeight: 1.04,
            }}
          >
            get paid.
          </div>
          <div style={{ fontSize: 28, color: '#6B5642', marginTop: 22 }}>
            Invoicing for African freelancers and creators.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 20,
            color: '#8A6A50',
          }}
        >
          <span>one link · no client account</span>
          <span>a clean record when the money lands</span>
        </div>
      </div>
    ),
    size,
  );
}
