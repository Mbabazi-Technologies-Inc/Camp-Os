// Adds a short confirmation to a redirect target; the app layout shows it as
// a toast (see components/ui/SavedToast.tsx) and then clears it from the URL.
export function withSaved(path: string, message: string) {
  return `${path}?saved=${encodeURIComponent(message)}`;
}
