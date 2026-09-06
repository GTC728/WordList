import { Link } from 'react-router-dom'
import { courseMeta, lessonScopeId, sublistScopeId } from '../data/course'

export function BankHubPage() {
  return (
    <main className="page">
      <p className="eyebrow">題庫</p>
      <h1>抽題練習</h1>
      <p className="lede">每詞自己的題塊庫。這一局只在你選的範圍裡抽；對了會冷卻，錯了會重出。</p>
      <div className="ui-grouped-section">
        {courseMeta.sublists.map((item) => (
          <div key={item.n} className="ui-grouped-row">
            <Link to={`/course/awl/sublist/${item.n}`}>
              <strong>Sublist {item.n}</strong>
              <p className="muted">{item.wordCount} 詞</p>
            </Link>
            <div className="row-actions">
              <Link to={`/bank/${sublistScopeId(item.n)}`}>整層</Link>
              <Link to={`/bank/${lessonScopeId(item.n, 0)}`}>第 1 課</Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
