import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'

import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // While the mobile menu is open: focus the close button, close on Escape,
  // and give focus back to the menu button when it closes.
  useEffect(() => {
    if (!menuOpen) return
    const menuButton = menuButtonRef.current
    closeButtonRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      menuButton?.focus()
    }
  }, [menuOpen])

  return (
    <div className="flex h-svh">
      {/* Desktop sidebar: always visible from 1024px up */}
      <Sidebar className="hidden lg:flex" />

      {/* Mobile and tablet: slide-over menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="absolute inset-0 bg-black/60"
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative h-full w-64 max-w-[85vw]">
            <Sidebar className="h-full w-full" onNavigate={() => setMenuOpen(false)} />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation menu"
              className="absolute left-full top-3 ml-2 flex size-10 items-center justify-center rounded-full bg-secondary text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenuClick={() => setMenuOpen(true)} menuButtonRef={menuButtonRef} />
        <main className="flex-1 overflow-y-auto px-4 pb-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}