import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { FormError } from '@/components/ui/FormError'
import { getFailureMessage } from '@/lib/failureMessage'

export interface ConfirmDialogProps {
  open: boolean
  title: ReactNode
  description: ReactNode
  confirmLabel: string
  /** A rejection keeps the dialog open and shows why. Resolving closes it. */
  onConfirm: () => Promise<void>
  onClose: () => void
  /** The dialog has no trigger, so the caller decides where focus goes. */
  onCloseAutoFocus: () => void
}

/** Asks before a destructive action, and stays open until that action has finished. */
export function ConfirmDialog({
  confirmLabel,
  description,
  onClose,
  onCloseAutoFocus,
  onConfirm,
  open,
  title,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function close() {
    setError(null)
    onClose()
  }

  async function confirm() {
    setIsConfirming(true)
    setError(null)

    try {
      await onConfirm()
      close()
    } catch (failure) {
      setError(getFailureMessage(failure))
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          close()
        }
      }}
      open={open}
    >
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onCloseAutoFocus()
        }}
        size="sm"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error ? <FormError>{error}</FormError> : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button
            loading={isConfirming}
            onClick={() => {
              void confirm()
            }}
            variant="destructive"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
