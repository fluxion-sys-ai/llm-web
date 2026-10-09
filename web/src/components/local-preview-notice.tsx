import { useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import '@/styles/local-preview.css'

export function LocalPreviewNotice() {
  const { t } = useTranslation()
  const noticeRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const notice = noticeRef.current
    if (!notice) return

    const body = document.body
    const previousMarker = body.getAttribute('data-local-preview')
    const previousHeight = body.style.getPropertyValue('--local-preview-height')
    const updateHeight = () => {
      body.style.setProperty(
        '--local-preview-height',
        `${notice.getBoundingClientRect().height}px`
      )
    }

    body.setAttribute('data-local-preview', '')
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(notice)

    return () => {
      observer.disconnect()
      if (previousMarker === null) body.removeAttribute('data-local-preview')
      else body.setAttribute('data-local-preview', previousMarker)
      if (previousHeight) {
        body.style.setProperty('--local-preview-height', previousHeight)
      } else {
        body.style.removeProperty('--local-preview-height')
      }
    }
  }, [])

  return (
    <div
      ref={noticeRef}
      role='status'
      className='bg-muted text-muted-foreground border-border pointer-events-none fixed inset-x-0 bottom-0 z-40 border-t px-4 py-2 text-center text-xs leading-4'
    >
      {t(
        'Local preview · Sample data and simulated replies. No live services connected.'
      )}
    </div>
  )
}
