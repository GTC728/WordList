import { Link } from 'react-router-dom'
import { courseMeta, lessonScopeId, sublistScopeId } from '../data/course'
import { useProgress } from '../lib/ProgressContext'

export function FullHubPage() {
  const { progress } = useProgress()
  const allRun = progress.full['awl-all']

  return (
    <main className="page">
      <p className="eyebrow">全題</p>
      <h1>每一題都會出現</h1>
      <p className="lede">不是抽樣。選一個範圍後，裡面每個單詞的每條題塊都會依序出完，中途離開會從下一題續打。</p>

      <Link className="course-card ui-pressable" to="/full/awl-all">
        <div>
          <p className="eyebrow">AWL</p>
          <h2>全部 570 詞</h2>
          <p>最完整，題量很大，適合當長期關卡。</p>
        </div>
        <p className="metric">{allRun && !allRun.finished ? `${allRun.cursor}/${allRun.order.length}` : '開始'}</p>
      </Link>

      <p className="section-label">依 Sublist</p>
      <div className="ui-grouped-section">
        {courseMeta.sublists.map((item) => {
          const scopeId = sublistScopeId(item.n)
          const run = progress.full[scopeId]
          return (
            <Link key={item.n} className="ui-grouped-row ui-pressable" to={`/full/${scopeId}`}>
              <div>
                <strong>Sublist {item.n}</strong>
                <p className="muted">
                  {item.wordCount} 詞
                  {run && !run.finished ? ` · 已到 ${run.cursor}/${run.order.length}` : ''}
                </p>
              </div>
              <span className="muted">全題</span>
            </Link>
          )
        })}
      </div>

      <p className="section-label">從第一課開始</p>
      <div className="ui-grouped-section">
        {courseMeta.sublists.map((item) => (
          <Link key={item.n} className="ui-grouped-row ui-pressable" to={`/full/${lessonScopeId(item.n, 0)}`}>
            <span>Sublist {item.n} · 第 1 課</span>
            <span className="muted">10 詞</span>
          </Link>
        ))}
      </div>
    </main>
  )
}
