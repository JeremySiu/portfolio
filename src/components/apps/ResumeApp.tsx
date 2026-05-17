import { useContext } from 'react'
import { AppSurfaceContext } from '../../context/AppSurfaceContext'

const RESUME_PDF = '/resume/Jeremy_Siu_Resume__AI_ML_.pdf'

export default function ResumeApp() {
  const surface = useContext(AppSurfaceContext)
  const light = surface === 'light'

  return (
    <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <iframe
        title="Jeremy Siu — resume (PDF)"
        src={`${RESUME_PDF}#view=FitH`}
        style={{
          display: 'block',
          width: '100%',
          height: 'min(75dvh, 720px)',
          minHeight: 440,
          border: 'none',
          background: '#fff',
        }}
      />
      {!light ? (
        <a
          href={RESUME_PDF}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            marginTop: 12,
            marginLeft: 16,
            marginRight: 16,
            marginBottom: 20,
            fontSize: 14,
            fontWeight: 500,
            color: '#5ac8fa',
          }}
        >
          Open PDF in new tab
        </a>
      ) : (
        <a
          href={RESUME_PDF}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            marginTop: 10,
            marginBottom: 12,
            marginLeft: 12,
            fontSize: 13,
            fontWeight: 500,
            color: '#2563eb',
          }}
        >
          Open in new tab
        </a>
      )}
    </div>
  )
}
