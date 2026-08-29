import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { WorldCardFieldVisibility } from '@/lib/commands'
import { useLocalization } from '@/hooks/use-localization'

interface WorldCardFieldTogglesProps {
  value: WorldCardFieldVisibility
  onChange: (value: WorldCardFieldVisibility) => void
}

export function WorldCardFieldToggles(props: WorldCardFieldTogglesProps) {
  const { value, onChange } = props
  const { t } = useLocalization()

  const fields: { key: keyof WorldCardFieldVisibility; label: string }[] = [
    { key: 'name', label: t('world-card:field-name') },
    { key: 'authorName', label: t('world-card:field-author') },
    { key: 'visits', label: t('world-card:field-visits') },
    { key: 'lastUpdated', label: t('world-card:field-last-updated') },
    { key: 'favorites', label: t('world-card:field-favorites') },
  ]

  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div key={field.key} className="flex items-center justify-between">
          <Label htmlFor={`field-visibility-${field.key}`}>{field.label}</Label>
          <Switch
            id={`field-visibility-${field.key}`}
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
