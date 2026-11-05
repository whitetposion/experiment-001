import { useAppSelector } from '@/app/hooks'
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { selectCurrentUser } from '@/features/presence'
import { getInitials } from '@/lib/initials'

export function UserProfileHeader() {
  const user = useAppSelector(selectCurrentUser)

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
      ) : (
        <div
          aria-busy="true"
          aria-label="Loading your profile"
          className="flex items-center gap-3"
          role="status"
        >
          <Skeleton className="size-10 rounded-pill" />
          <Skeleton className="h-4 w-32" />
        </div>
      )}
      <span className="ml-auto">
        <ThemeSwitcher />
      </span>
    </header>
  )
}
