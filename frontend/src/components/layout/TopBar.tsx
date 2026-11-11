import { Bell, Moon, Search } from 'lucide-react'
import { useEffect, useRef } from 'react'

export function TopBar() {
  const searchRef = useRef<HTMLInputElement>(null)

  // Ctrl+K (or Cmd+K) focuses the search box
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <header className="flex items-center justify-between gap-4 px-8 py-5">
      <div className="relative w-full max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#5385F7]" />
        <input
          ref={searchRef}
          type="search"
          aria-label="Search properties and documents"
          placeholder="Search properties, documents...  (Ctrl + K)"
          className="h-12 w-full rounded-2xl border border-border bg-secondary pl-12 pr-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="flex size-11 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground"
        >
          <Bell className="size-5" />
        </button>
        <button
          type="button"
          disabled
          title="Light theme is not built yet"
          aria-label="Theme toggle (light theme not available yet)"
          className="flex size-11 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground opacity-70"
        >
          <Moon className="size-5" />
        </button>
      </div>
    </header>
  )
}