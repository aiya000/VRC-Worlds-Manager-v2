import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { WorldDetailFieldVisibility } from '@/lib/commands'
import { useLocalization } from '@/hooks/use-localization'

interface WorldDetailFieldTogglesProps {
  value: WorldDetailFieldVisibility
  onChange: (value: WorldDetailFieldVisibility) => void
}

export function WorldDetailFieldToggles(props: WorldDetailFieldTogglesProps) {
  const { value, onChange } = props
  const { t } = useLocalization()

  const fields: { key: keyof WorldDetailFieldVisibility; label: string }[] = [
    { key: 'visits', label: t('world-detail:field-visits') },
    { key: 'favorites', label: t('world-detail:field-favorites') },
    { key: 'capacity', label: t('world-detail:field-capacity') },
    { key: 'published', label: t('world-detail:field-published') },
    { key: 'lastUpdated', label: t('world-detail:field-last-updated') },
  ]

  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div key={field.key} className="flex items-center justify-between">
          <Label htmlFor={`detail-field-visibility-${field.key}`}>
            {field.label}
          </Label>
          <Switch
            id={`detail-field-visibility-${field.key}`}
            checked={value[field.key]}
            onCheckedChange={(checked) =>
              onChange({ ...value, [field.key]: checked })
            }
          />
        </div>
      ))}
    </div>
  )
}
