import { Link } from 'react-router-dom'
import { BackLink } from '../components/ui'
import { courseMeta, lessonScopeId, sublistScopeId } from '../data/course'

export function BankHubPage() {
  return (
    <main className="page">
      <BackLink to="/" label="首頁" />
      <p className="kicker">題庫模式</p>
      <h1>選一堆詞來抽題</h1>
      <p className="lede">
        課程大綱仍按課走；這裡是另一種練法：每個單詞有自己的題塊庫，這一局只在你選的範圍裡抽。
      </p>
      <ol className="sublist-map">
        {courseMeta.sublists.map((item) => (
          <li key={item.n}>
            <Link className="map-row" to={`/course/awl/sublist/${item.n}`}>
              <div>
                <strong>Sublist {item.n}</strong>
                <span>可練整層，或進單元選單課題庫</span>
              </div>
            </Link>
            <div className="row-actions">
              <Link to={`/bank/${sublistScopeId(item.n)}`}>整層題庫</Link>
              <Link to={`/bank/${lessonScopeId(item.n, 0)}`}>第 1 課題庫</Link>
            </div>
          </li>
        ))}
      </ol>
    </main>
  )
}
