import { BackLink } from '../components/ui'
import { Fold } from '../components/Fold'
import { ModeCard, NumRow } from '../components/ModeCard'
import { courseMeta, sublistScopeId } from '../data/meta'
import { useProgress } from '../lib/ProgressContext'

export function BankHubPage() {
  const { progress } = useProgress()
  const allGames = progress.bank['awl-all']?.gameIndex ?? 0

  return (
    <div className="page">
      <BackLink to="/" label="課程" />
      <ModeCard to="/practice/awl-all" icon="cards" title="全部" stat={allGames ? String(allGames) : undefined} />
      <div className="ui-grouped-section">
        {courseMeta.sublists.map((item) => {
          const games = progress.bank[sublistScopeId(item.n)]?.gameIndex ?? 0
          return (
            <NumRow
              key={item.n}
              n={item.n}
              to={`/practice/${sublistScopeId(item.n)}`}
              label={`Sublist ${item.n}`}
              trailing={games ? <span className="progress-row-count">{games}</span> : null}
            />
          )
        })}
      </div>
      <Fold label="規則">
        <ul className="rules">
          <li>答對的題五局內不再出。</li>
          <li>新詞先看單詞，再選中文意思。</li>
          <li>同一詞做過五次才出拼字。</li>
        </ul>
      </Fold>
    </div>
  )
}
