import { WorldDetailFieldVisibility } from '@/lib/commands'
import { useLocalization } from '@/hooks/use-localization'
import { WorldDetailFields } from '@/components/world-detail-fields'

interface WorldDetailPreviewProps {
  fieldVisibility: WorldDetailFieldVisibility
}

const SAMPLE = {
  visits: 1911,
  favorites: 616,
  capacity: 16,
  recommendedCapacity: null,
  publicationDate: '2025-01-01',
  lastUpdated: '2025-02-28',
}

export function WorldDetailPreview(props: WorldDetailPreviewProps) {
  const { fieldVisibility } = props
  const { t } = useLocalization()

  // The popup drops the heading along with the grid once every field is off,
  // so the preview has nothing to show either.
  if (!Object.values(fieldVisibility).some(Boolean)) {
    return null
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-sm font-semibold mb-2">
        {t('world-detail:details')}
      </div>
      <WorldDetailFields
        visibility={fieldVisibility}
        visits={SAMPLE.visits}
        favorites={SAMPLE.favorites}
        capacity={SAMPLE.capacity}
        recommendedCapacity={SAMPLE.recommendedCapacity}
        publicationDate={SAMPLE.publicationDate}
        lastUpdated={SAMPLE.lastUpdated}
      />
    </div>
  )
}
