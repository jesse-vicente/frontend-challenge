import { useAnnouncement } from '../a11y/announcer'

/** Global aria-live regions; messages come from `announce()`. */
export function LiveRegion() {
  const announcement = useAnnouncement()
  return (
    <>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement?.politeness === 'polite' ? <span key={announcement.id}>{announcement.message}</span> : null}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcement?.politeness === 'assertive' ? <span key={announcement.id}>{announcement.message}</span> : null}
      </div>
    </>
  )
}
