import { Analytics } from '@vercel/analytics/react'
import MobileView from './components/MobileView'

export default function App() {
  return (
    <>
      <MobileView />
      <Analytics />
    </>
  )
}
