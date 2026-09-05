import { WorldDetailFieldVisibility } from '@/lib/commands'
import { useLocalization } from '@/hooks/use-localization'
import { formatDate, formatDateTime } from '@/lib/utils'

interface WorldDetailFieldsProps {
  visibility: WorldDetailFieldVisibility
  visits: number
  favorites: number
  capacity: number
  recommendedCapacity: number | null
  publicationDate: string | null
  lastUpdated: string
}

// Shared by the world detail popup and the preview on the settings pages, so
// that turning a field off shows exactly what the popup will look like.
export function WorldDetailFields(props: WorldDetailFieldsProps) {
  const {
    visibility,
    visits,
    favorites,
    capacity,
    recommendedCapacity,
    publicationDate,
    lastUpdated,
  } = props
  const { t, language } = useLocalization()

  return (
    <div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
      {visibility.visits && (
        <>
          <div className="text-gray-500">{t('world-detail:visits')}</div>
          <div>{visits}</div>
        </>
      )}

      {visibility.favorites && (
        <>
          <div className="text-gray-500">{t('world-detail:favorites')}</div>
          <div>{favorites}</div>
        </>
      )}

      {visibility.capacity && (
        <>
          <div className="text-gray-500">{t('world-detail:capacity')}</div>
          <div>
            {recommendedCapacity !== null
              ? `${recommendedCapacity} (${t('world-detail:max')} ${capacity})`
              : capacity}
          </div>
        </>
      )}

      {visibility.published && publicationDate !== null && (
        <>
          <div className="text-gray-500">{t('world-detail:published')}</div>
          <div>{formatDate(publicationDate, language)}</div>
        </>
      )}

      {visibility.lastUpdated && (
        <>
          <div className="text-gray-500">{t('world-detail:last-updated')}</div>
          <div>{formatDateTime(lastUpdated, language)}</div>
        </>
      )}
    </div>
  )
}
