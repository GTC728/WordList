import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ProgressProvider } from './lib/ProgressContext'
import { HomePage } from './pages/HomePage'
import { SettingsPage } from './pages/SettingsPage'

const CoursePage = lazy(async () => {
  const m = await import('./pages/CoursePage')
  return { default: m.CoursePage }
})
const BankHubPage = lazy(async () => {
  const m = await import('./pages/BankHubPage')
  return { default: m.BankHubPage }
})
const BankPlayPage = lazy(async () => {
  const m = await import('./pages/BankPlayPage')
  return { default: m.BankPlayPage }
})
const BankStatsPage = lazy(async () => {
  const m = await import('./pages/BankStatsPage')
  return { default: m.BankStatsPage }
})
const BankSublistStatsPage = lazy(async () => {
  const m = await import('./pages/BankStatsPage')
  return { default: m.BankSublistStatsPage }
})
const BankWordStatsPage = lazy(async () => {
  const m = await import('./pages/BankStatsPage')
  return { default: m.BankWordStatsPage }
})
const DrillHubPage = lazy(async () => {
  const m = await import('./pages/DrillPage')
  return { default: m.DrillHubPage }
})
const DrillListPage = lazy(async () => {
  const m = await import('./pages/DrillPage')
  return { default: m.DrillListPage }
})
const DrillPlayPage = lazy(async () => {
  const m = await import('./pages/DrillPage')
  return { default: m.DrillPlayPage }
})
const EndlessPage = lazy(async () => {
  const m = await import('./pages/EndlessPage')
  return { default: m.EndlessPage }
})
const EndlessPlayPage = lazy(async () => {
  const m = await import('./pages/EndlessPage')
  return { default: m.EndlessPlayPage }
})
const LessonPage = lazy(async () => {
  const m = await import('./pages/LessonPage')
  return { default: m.LessonPage }
})
const ReviewPage = lazy(async () => {
  const m = await import('./pages/ReviewPage')
  return { default: m.ReviewPage }
})
const SublistPage = lazy(async () => {
  const m = await import('./pages/SublistPage')
  return { default: m.SublistPage }
})
const WordPage = lazy(async () => {
  const m = await import('./pages/WordPage')
  return { default: m.WordPage }
})

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

function RedirectPracticeScope() {
  const { scopeId } = useParams()
  return <Navigate to={`/practice/${scopeId ?? ''}`} replace />
}

function PageFallback() {
  return (
    <div className="page page-loading">
      <p className="muted">載入中</p>
    </div>
  )
}

export default function App() {
  return (
    <ProgressProvider>
      <BrowserRouter basename={basename}>
        <AppShell>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/course" element={<CoursePage />} />
              <Route path="/course/awl" element={<CoursePage />} />
              <Route path="/course/awl/sublist/:n" element={<SublistPage />} />
              <Route path="/lesson/awl/:sublist/:lesson" element={<LessonPage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/practice" element={<BankHubPage />} />
              <Route path="/practice/:scopeId" element={<BankPlayPage />} />
              <Route path="/bank" element={<BankStatsPage />} />
              <Route path="/bank/sub/:n" element={<BankSublistStatsPage />} />
              <Route path="/bank/word/:id" element={<BankWordStatsPage />} />
              <Route path="/bank/:scopeId" element={<RedirectPracticeScope />} />
              <Route path="/endless" element={<EndlessPage />} />
              <Route path="/endless/play" element={<EndlessPlayPage />} />
              <Route path="/drill" element={<DrillHubPage />} />
              <Route path="/drill/:kind" element={<DrillListPage />} />
              <Route path="/drill/:kind/play" element={<DrillPlayPage />} />
              <Route path="/full" element={<Navigate to="/" replace />} />
              <Route path="/full/:scopeId" element={<Navigate to="/" replace />} />
              <Route path="/word/:id" element={<WordPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AppShell>
      </BrowserRouter>
    </ProgressProvider>
  )
}
