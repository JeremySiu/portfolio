import { createContext } from 'react'

/** 'light' = Mac-style window on #ececed; 'dark' = full-screen mobile sheet (--app-surface). */
export type AppSurfaceMode = 'light' | 'dark'

export const AppSurfaceContext = createContext<AppSurfaceMode>('dark')
