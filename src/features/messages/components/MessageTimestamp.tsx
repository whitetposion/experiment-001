import { formatMessageTime } from '@/lib/formatMessageDate'

export interface MessageTimestampProps {
  timestamp: string
  isEdited: boolean
}

export function MessageTimestamp({ isEdited, timestamp }: MessageTimestampProps) {
  return (
    <span className="text-xs whitespace-nowrap tabular-nums">
      {isEdited ? 'Edited ' : null}
      <time dateTime={timestamp}>{formatMessageTime(timestamp)}</time>
    </span>
  )
}
