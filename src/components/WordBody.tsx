import { Link } from 'react-router-dom'
import { getSynonyms } from '../data/course'
import type { WordCard } from '../types'
import { Fold } from './Fold'
import { SpeakButton } from './ui'

export function WordBody({
  word,
  speech,
}: {
  word: WordCard
  speech: boolean
}) {
  const synonyms = getSynonyms(word.id)
  return (
    <article className="word-card">
      <div className="word-head">
        <h2 className="headword">
          <Link to={`/word/${word.id}`}>{word.headword}</Link>
        </h2>
        <SpeakButton text={word.headword} enabled={speech} />
      </div>
      <p className="gloss-zh">{word.glossZh}</p>
      <p className="example">{word.example.en}</p>
      <Fold label="更多">
        <p>{word.glossEn}</p>
        {word.family.length > 0 && (
          <ul className="chips">
            {word.family.map((item) => (
              <li key={`${item.form}-${item.role}`}>
                {item.form}
                <span>{item.role}</span>
              </li>
            ))}
          </ul>
        )}
        {word.collocations.length > 0 && (
          <ul className="cols">
            {word.collocations.map((item) => (
              <li key={`${item.left}-${item.right}`}>
                {item.left} + {item.right}
              </li>
            ))}
          </ul>
        )}
        {synonyms.length > 0 ? <p>{synonyms.join(', ')}</p> : null}
      </Fold>
    </article>
  )
}
