import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { fetchDirectory, selectCurrentUser, selectDirectoryStatus } from '@/features/presence'
import { getInitials } from '@/lib/initials'

function ProfileSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading your profile"
      className="flex items-center gap-3"
      role="status"
    >
      <Skeleton className="size-10 rounded-pill" />
      <Skeleton className="h-4 w-32" />
    </div>
  )
}

/** Names come from the same request, so without this every chat just says Unknown contact. */
function ProfileError() {
  const dispatch = useAppDispatch()

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2" role="alert">
      <p className="min-w-0 flex-1 text-sm text-muted-foreground">Could not load people</p>
      <Button
        onClick={() => {
          void dispatch(fetchDirectory())
        }}
        size="sm"
        variant="secondary"
      >
        Try again
      </Button>
    </div>
  )
}

export function UserProfileHeader() {
  const user = useAppSelector(selectCurrentUser)
  const status = useAppSelector(selectDirectoryStatus)

  return (
    <header className="flex min-h-control items-center gap-3">
      {user ? (
        <>
          <Avatar
            alt=""
            fallback={getInitials(user.displayName)}
            src={user.avatarUrl ?? undefined}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold tracking-tight">{user.displayName}</p>
            {user.about ? (
              <p className="truncate text-xs text-muted-foreground">{user.about}</p>
            ) : null}
          </div>
        </>
      ) : status === 'failed' ? (
        <ProfileError />
      ) : (
        <ProfileSkeleton />
      )}
      <span className="ml-auto">
        <ThemeSwitcher />
      </span>
    </header>
  )
}
