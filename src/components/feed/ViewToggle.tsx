import { LayoutList, Table2 } from 'lucide-react'
import { Segmented } from '@/components/ui/Segmented'

export type FeedView = 'feed' | 'table'

export function ViewToggle({ value, onChange }: { value: FeedView; onChange: (v: FeedView) => void }) {
  return (
    <Segmented
      size="sm"
      value={value}
      onChange={onChange}
      options={[
        { value: 'feed', label: 'Timeline', icon: <LayoutList className="size-3.5" /> },
        { value: 'table', label: 'Table', icon: <Table2 className="size-3.5" /> },
      ]}
    />
  )
}
