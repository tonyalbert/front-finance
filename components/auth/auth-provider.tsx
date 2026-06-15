"use client"

import React, { createContext, useCallback, useEffect, useMemo, useState } from "react"

import { apiFetch } from "@/lib/api"

type AuthUser = {
  email: string
  isAdmin: boolean
}

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isReady: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

type AuthResponse = {
  accessToken: string
}

const STORAGE_KEY = "pit-finance:auth"

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function decodeJwtPayload(token: string): { email: string; isAdmin: boolean } {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
  return JSON.parse(atob(base64))
}

function readStoredAuth(): { token: string | null; email: string | null; isAdmin: boolean } {
  if (typeof window === "undefined") return { token: null, email: null, isAdmin: false }
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return { token: null, email: null, isAdmin: false }
  try {
    const parsed = JSON.parse(raw) as { token?: string; email?: string; isAdmin?: boolean }
    return {
      token: parsed.token ?? null,
      email: parsed.email ?? null,
      isAdmin: parsed.isAdmin ?? false,
    }
  } catch {
    return { token: null, email: null, isAdmin: false }
  }
}

function writeStoredAuth(token: string, email: string, isAdmin: boolean) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ token, email, isAdmin })
  )
}

function clearStoredAuth() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEY)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const stored = readStoredAuth()
    if (stored.token && stored.email) {
      setToken(stored.token)
      setUser({ email: stored.email, isAdmin: stored.isAdmin })
    }
    setIsReady(true)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    const payload = decodeJwtPayload(data.accessToken)
    const isAdmin = payload.isAdmin ?? false
    setToken(data.accessToken)
    setUser({ email, isAdmin })
    writeStoredAuth(data.accessToken, email, isAdmin)
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    const payload = decodeJwtPayload(data.accessToken)
    const isAdmin = payload.isAdmin ?? false
    setToken(data.accessToken)
    setUser({ email, isAdmin })
    writeStoredAuth(data.accessToken, email, isAdmin)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    clearStoredAuth()
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isReady,
      login,
      register,
      logout,
    }),
    [user, token, isReady, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error("useAuthContext deve ser usado dentro de AuthProvider")
  }
  return context
}
