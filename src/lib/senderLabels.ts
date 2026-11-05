export const UNKNOWN_CONTACT = 'Unknown contact'

export function firstName(displayName: string | undefined) {
  return displayName?.split(' ')[0]
}

export function deletedMessageLabel(isOwn: boolean) {
  return isOwn ? 'You deleted this message' : 'This message was deleted'
}
