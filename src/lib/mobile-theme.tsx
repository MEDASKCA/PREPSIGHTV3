"use client"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type MobileTheme = "dark" | "light"

const MobileThemeContext = createContext<{ theme: MobileTheme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
})

export function MobileThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<MobileTheme>("dark")

  useEffect(() => {
    const stored = localStorage.getItem("prepsight_mobile_theme") as MobileTheme | null
    if (stored === "light" || stored === "dark") setTheme(stored)
  }, [])

  const toggle = () =>
    setTheme(t => {
      const next = t === "dark" ? "light" : "dark"
      localStorage.setItem("prepsight_mobile_theme", next)
      return next
    })

  return (
    <MobileThemeContext.Provider value={{ theme, toggle }}>
      <div data-mobile-theme={theme} className="contents">
        {children}
      </div>
    </MobileThemeContext.Provider>
  )
}

export function useMobileTheme() {
  return useContext(MobileThemeContext)
}
