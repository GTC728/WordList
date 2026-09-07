import { useParams } from 'react-router-dom'
import { BackLink } from '../components/ui'
import { WordBody } from '../components/WordBody'
import { getWord } from '../data/course'
import { useProgress } from '../lib/ProgressContext'

export function WordPage() {
  const { id } = useParams()
  const word = id ? getWord(id) : undefined
  const { progress } = useProgress()

  if (!word) {
    return (
      <div className="page">
        <BackLink to="/course" label="課程" />
        <p>找不到這個詞。</p>
      </div>
    )
  }

  return (
    <div className="page">
      <BackLink to={`/course/awl/sublist/${word.sublist}`} label={`Sublist ${word.sublist}`} />
      <WordBody word={word} speech={progress.settings.speech} />
    </div>
  )
}
