import { WASTE_TYPES, type WasteTypeId } from '../data/wasteTypes'

type Props = {
  typeId: WasteTypeId
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5 font-medium',
}

export function WasteBadge({ typeId, size = 'md' }: Props) {
  const waste = WASTE_TYPES[typeId]
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${waste.bgColor} ${waste.textColor} ${waste.borderColor} ${sizeClasses[size]}`}
    >
      {size === 'sm' ? waste.shortLabel : waste.label}
    </span>
  )
}
