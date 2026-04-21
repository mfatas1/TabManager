import { Link, useLocation, useSearchParams } from "react-router-dom"
import { LogIn, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/auth/useAuth"

export function NavBar({ items, className }) {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const currentTag = searchParams.get('tag')
  const { isAuthenticated, loading, signOut, user } = useAuth()

  if (loading) return null
  if (!isAuthenticated && (location.pathname === '/' || location.pathname === '/login')) return null

  // Determine active tab based on current route
  const activeTab = items.find(item => (
    item.url === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.url)
  ))?.name || items[0].name

  return (
    <div
      className={cn(
        "fixed bottom-5 sm:bottom-auto sm:top-4 left-1/2 -translate-x-1/2 z-50",
        className,
      )}
    >
      <div className="flex items-center gap-1 bg-white/90 border border-[#d8ded8] backdrop-blur py-1 px-1 rounded-lg shadow-sm">
        {isAuthenticated && items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.name

          return (
            <Link
              key={item.name}
              to={currentTag && (item.url === '/library' || item.url === '/graph') ? `${item.url}?tag=${currentTag}` : item.url}
              className={cn(
                "relative cursor-pointer text-sm font-semibold px-5 py-2 rounded-md transition-colors",
                "text-[#68746f] hover:text-[#26312d]",
                isActive && "bg-[#e7efea] text-[#5b21b6]",
              )}
            >
              <span className="hidden md:inline">{item.name}</span>
              <span className="md:hidden">
                <Icon size={18} strokeWidth={2.5} />
              </span>
              {isActive && <span className="absolute inset-0 w-full bg-[#e7efea] rounded-md -z-10" />}
            </Link>
          )
        })}
        <div className="mx-1 h-5 w-px bg-[#d8ded8]" />
        {isAuthenticated ? (
          <button
            type="button"
            onClick={signOut}
            title={user?.email ? `Sign out ${user.email}` : 'Sign out'}
            className="relative cursor-pointer rounded-md px-3 py-2 text-sm font-semibold text-[#68746f] transition-colors hover:text-[#26312d]"
          >
            <span className="hidden md:inline">Sign out</span>
            <span className="md:hidden">
              <LogOut size={18} strokeWidth={2.5} />
            </span>
          </button>
        ) : (
          <Link
            to="/login"
            className={cn(
              "relative cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-colors",
              location.pathname === '/login'
                ? "bg-[#e7efea] text-[#5b21b6]"
                : "text-[#68746f] hover:text-[#26312d]",
            )}
          >
            <span className="hidden md:inline">Sign in</span>
            <span className="md:hidden">
              <LogIn size={18} strokeWidth={2.5} />
            </span>
          </Link>
        )}
      </div>
    </div>
  )
}
