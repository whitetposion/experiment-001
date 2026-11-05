import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { selectAddableUsers } from '@/features/conversations/state/selectors'
import { addGroupMembers } from '@/features/conversations/state/thunks'
import { getInitials } from '@/lib/initials'
import type { ApiFailure } from '@/services/apiError'
import type { ConversationId } from '@/types/ids'

interface AddMembersValues {
  userIds: string[]
}

export interface AddMembersFormProps {
  conversationId: ConversationId
  onDone: () => void
}

export function AddMembersForm({ conversationId, onDone }: AddMembersFormProps) {
  const dispatch = useAppDispatch()
  const candidates = useAppSelector((state) => selectAddableUsers(state, conversationId))
  const [error, setError] = useState<string | null>(null)
  const {
    control,
    formState: { isSubmitting },
    handleSubmit,
    register,
  } = useForm<AddMembersValues>({ defaultValues: { userIds: [] } })
  const selectedIds = useWatch({ control, name: 'userIds' })

  async function addMembers({ userIds }: AddMembersValues) {
    setError(null)

    try {
      await dispatch(
        addGroupMembers({
          conversationId,
          userIds: candidates.filter(({ id }) => userIds.includes(id)).map(({ id }) => id),
        }),
      ).unwrap()
      onDone()
    } catch (failure) {
      setError((failure as ApiFailure).message)
    }
  }

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">Everyone you know is already in this group.</p>
        <Button autoFocus onClick={onDone} size="sm" variant="secondary">
          Back to members
        </Button>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => void handleSubmit(addMembers)(event)}
    >
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm text-muted-foreground">Choose people to add</legend>
        {candidates.map(({ displayName, id }, index) => (
          <label
            className="flex min-h-control cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-muted"
            key={id}
          >
            <input
              autoFocus={index === 0}
              className="size-5 shrink-0 accent-primary"
              type="checkbox"
              value={id}
              {...register('userIds')}
            />
            <Avatar alt="" fallback={getInitials(displayName)} size="sm" />
            <span className="min-w-0 truncate text-sm font-medium">{displayName}</span>
          </label>
        ))}
      </fieldset>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button onClick={onDone} size="sm" variant="secondary">
          Cancel
        </Button>
        <Button disabled={selectedIds.length === 0} loading={isSubmitting} size="sm" type="submit">
          {selectedIds.length > 1 ? `Add ${String(selectedIds.length)} people` : 'Add'}
        </Button>
      </div>
    </form>
  )
}
