import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onOpenChange,
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md rounded-lg border-[var(--tm-border)] bg-white p-6 text-[#1e1b2e] shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-lg font-semibold text-[#1e1b2e]">
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-sm leading-relaxed text-[var(--tm-text-secondary)]">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-md border-[var(--tm-border-mid)] bg-white px-4 py-2 text-sm font-semibold text-[var(--tm-accent-hover)] hover:bg-[#f7f8f5]">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white ${
              destructive
                ? 'bg-[#b94a48] hover:bg-[#9d3c3a]'
                : 'bg-[var(--tm-accent-hover)] hover:bg-[var(--tm-accent-press)]'
            }`}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
