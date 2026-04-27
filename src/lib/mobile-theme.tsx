"use client"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type MobileTheme = "dark" | "light"

const MOBILE_ROOT_ID = "mobile-app-root"

const MobileThemeContext = createContext<{ theme: MobileTheme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
})

function applyTheme(theme: MobileTheme) {
  document.getElementById(MOBILE_ROOT_ID)?.setAttribute("data-mobile-theme", theme)
}

export function MobileThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<MobileTheme>("dark")

  useEffect(() => {
    const stored = localStorage.getItem("prepsight_mobile_theme") as MobileTheme | null
    const resolved = stored === "light" || stored === "dark" ? stored : "dark"
    setTheme(resolved)
    applyTheme(resolved)
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggle = () =>
    setTheme(t => {
      const next = t === "dark" ? "light" : "dark"
      localStorage.setItem("prepsight_mobile_theme", next)
      return next
    })

  return (
    <MobileThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </MobileThemeContext.Provider>
  )
}

export function useMobileTheme() {
  return useContext(MobileThemeContext)
}
