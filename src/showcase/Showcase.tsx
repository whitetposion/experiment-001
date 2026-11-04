import { EllipsisVertical, Plus, Search, Send, Settings, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { Separator } from '@/components/ui/Separator'
import { Textarea } from '@/components/ui/Textarea'
import { Tooltip } from '@/components/ui/Tooltip'
import { applyTheme, THEMES, type ShowcaseTheme } from './theme'

const BUTTON_VARIANTS = ['primary', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const
const SIZES = ['sm', 'md', 'lg'] as const
const BADGE_VARIANTS = [
  'neutral',
  'primary',
  'secondary',
  'accent',
  'success',
  'warning',
  'destructive',
  'info',
  'outline',
] as const

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
    </label>
  )
}

export function Showcase({ initialTheme }: { initialTheme: ShowcaseTheme }) {
  const [theme, setTheme] = useState(initialTheme)
  const [notifications, setNotifications] = useState(true)
  const [density, setDensity] = useState('comfortable')

  function selectTheme(nextTheme: ShowcaseTheme) {
    applyTheme(nextTheme)
    setTheme(nextTheme)
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-section p-gutter">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Component showcase</h1>
        <div aria-label="Theme" className="flex gap-2" role="group">
          {THEMES.map((option) => (
            <Button
              aria-pressed={theme === option}
              key={option}
              onClick={() => {
                selectTheme(option)
              }}
              size="sm"
              variant={theme === option ? 'primary' : 'outline'}
            >
              {option}
            </Button>
          ))}
        </div>
      </header>

      <Section title="Composition">
        <div className="grid items-start gap-section md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Row>
              <IconButton label="More options" variant="outline">
                <EllipsisVertical aria-hidden="true" />
              </IconButton>
              <span className="flex-1 text-center font-semibold">Contacts</span>
              <IconButton label="New contact" variant="primary">
                <Plus aria-hidden="true" />
              </IconButton>
            </Row>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input aria-label="Search contacts" className="pl-10" placeholder="Search" />
            </div>
          </div>
          <Card className="items-center text-center">
            <Avatar alt="Northwind Studio" fallback="NS" size="xl" />
            <CardHeader>
              <CardTitle>Northwind Studio</CardTitle>
              <CardDescription>Business account · Joined in March 2026</CardDescription>
            </CardHeader>
            <div className="flex w-full flex-col gap-2">
              <Button variant="secondary">View profile</Button>
              <Button variant="secondary">Mute</Button>
            </div>
          </Card>
        </div>
      </Section>

      <Section title="Button">
        {SIZES.map((size) => (
          <Row key={size}>
            {BUTTON_VARIANTS.map((variant) => (
              <Button key={variant} size={size} variant={variant}>
                {variant}
              </Button>
            ))}
          </Row>
        ))}
        <Row>
          <Button>
            <Send aria-hidden="true" /> With icon
          </Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
          <Button loading variant="outline">
            Loading
          </Button>
          <Button asChild variant="outline">
            <a href="#top">Link as button</a>
          </Button>
        </Row>
      </Section>

      <Section title="IconButton">
        {SIZES.map((size) => (
          <Row key={size}>
            <IconButton label="Search" size={size}>
              <Search aria-hidden="true" />
            </IconButton>
            <IconButton label="Add" size={size} variant="primary">
              <Plus aria-hidden="true" />
            </IconButton>
            <IconButton label="Settings" size={size} variant="outline">
              <Settings aria-hidden="true" />
            </IconButton>
            <IconButton label="Delete" size={size} variant="destructive">
              <Trash2 aria-hidden="true" />
            </IconButton>
            <IconButton disabled label="Disabled" size={size}>
              <Search aria-hidden="true" />
            </IconButton>
            <IconButton label="Sending" loading size={size} variant="secondary">
              <Send aria-hidden="true" />
            </IconButton>
          </Row>
        ))}
      </Section>

      <Section title="Input and Textarea">
        <div className="grid gap-3 md:grid-cols-2">
          {SIZES.map((size) => (
            <Field key={size} label={`Input ${size}`}>
              <Input placeholder="Placeholder" size={size} />
            </Field>
          ))}
          <Field label="Invalid">
            <Input aria-invalid defaultValue="Invalid value" />
          </Field>
          <Field label="Disabled">
            <Input defaultValue="Disabled" disabled />
          </Field>
          <Field label="Textarea">
            <Textarea placeholder="Placeholder" rows={3} />
          </Field>
          <Field label="Auto-resizing textarea">
            <Textarea autoResize defaultValue={'Type here\nto grow'} />
          </Field>
        </div>
      </Section>

      <Section title="Avatar">
        <Row>
          <Avatar alt="Asha Rao" fallback="AR" size="sm" />
          <Avatar alt="Asha Rao" fallback="AR" size="md" />
          <Avatar alt="Asha Rao" fallback="AR" size="lg" />
          <Avatar alt="Asha Rao" fallback="AR" size="xl" />
          <Avatar alt="Design team" fallback="DT" shape="square" size="lg" />
        </Row>
      </Section>

      <Section title="Badge">
        {(['sm', 'md'] as const).map((size) => (
          <Row key={size}>
            {BADGE_VARIANTS.map((variant) => (
              <Badge key={variant} size={size} variant={variant}>
                {variant}
              </Badge>
            ))}
          </Row>
        ))}
      </Section>

      <Section title="Card">
        <div className="grid gap-3 md:grid-cols-3">
          {(['surface', 'elevated', 'outline'] as const).map((variant) => (
            <Card key={variant} variant={variant}>
              <CardHeader>
                <CardTitle>{variant}</CardTitle>
                <CardDescription>Card description text</CardDescription>
              </CardHeader>
              <CardContent>Card content uses the matching foreground token.</CardContent>
              <CardFooter>
                <Button size="sm">Action</Button>
                <Button size="sm" variant="ghost">
                  Cancel
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Separator">
        <Separator />
        <div className="flex h-6 items-center gap-3 text-sm">
          <span>One</span>
          <Separator orientation="vertical" />
          <span>Two</span>
        </div>
      </Section>

      <Section title="Tooltip">
        <Row>
          <Tooltip content="Tooltip on a button">
            <Button variant="outline">Hover or focus</Button>
          </Tooltip>
          <Tooltip content="Search" side="right">
            <IconButton label="Search with tooltip" variant="outline">
              <Search aria-hidden="true" />
            </IconButton>
          </Tooltip>
        </Row>
      </Section>

      <Section title="Dialog">
        <Row>
          {SIZES.map((size) => (
            <Dialog key={size}>
              <DialogTrigger asChild>
                <Button variant="outline">Open {size}</Button>
              </DialogTrigger>
              <DialogContent size={size}>
                <DialogHeader>
                  <DialogTitle>Dialog title</DialogTitle>
                  <DialogDescription>Focus stays inside until it closes.</DialogDescription>
                </DialogHeader>
                <Field label="Name">
                  <Input placeholder="Placeholder" />
                </Field>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button>Save</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ))}
        </Row>
      </Section>

      <Section title="Dropdown menu">
        <Row>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton label="Open menu" variant="outline">
                <EllipsisVertical aria-hidden="true" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem>
                <Settings aria-hidden="true" /> Settings
                <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>Disabled item</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={notifications} onCheckedChange={setNotifications}>
                Notifications
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Density</DropdownMenuLabel>
              <DropdownMenuRadioGroup onValueChange={setDensity} value={density}>
                <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <Trash2 aria-hidden="true" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Row>
      </Section>
    </main>
  )
}
