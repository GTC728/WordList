import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProgressProvider } from './lib/ProgressContext'
import { CoursePage } from './pages/CoursePage'
import { HomePage } from './pages/HomePage'
import { BankHubPage } from './pages/BankHubPage'
import { BankPlayPage } from './pages/BankPlayPage'
import { LessonPage } from './pages/LessonPage'
import { ReviewPage } from './pages/ReviewPage'
import { SettingsPage } from './pages/SettingsPage'
import { SublistPage } from './pages/SublistPage'
import { WordPage } from './pages/WordPage'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <ProgressProvider>
      <BrowserRouter basename={basename}>
        <div className="shell">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/course/awl" element={<CoursePage />} />
            <Route path="/course/awl/sublist/:n" element={<SublistPage />} />
            <Route path="/lesson/awl/:sublist/:lesson" element={<LessonPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/bank" element={<BankHubPage />} />
            <Route path="/bank/:scopeId" element={<BankPlayPage />} />
            <Route path="/word/:id" element={<WordPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ProgressProvider>
  )
}
