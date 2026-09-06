export type FamilyRole = '動詞' | '名詞' | '形容詞' | '副詞'

export type FamilyForm = {
  form: string
  role: FamilyRole | string
}

export type Collocation = {
  left: string
  right: string
}

export type WordCard = {
  id: string
  headword: string
  sublist: number
  glossZh: string
  glossEn: string
  family: FamilyForm[]
  example: {
    en: string
    blank: string
  }
  collocations: Collocation[]
  familyQuiz?: {
    sentence: string
    blank: string
    role: string
  }
}

export type SublistMeta = {
  n: number
  wordCount: number
  lessonCount: number
}

export type CourseMeta = {
  id: string
  title: string
  titleZh: string
  headwordCount: number
  attribution: string
  sublists: SublistMeta[]
}

export type QuestionType =
  | 'meaning'
  | 'form'
  | 'cloze'
  | 'family'
  | 'collocation'
  | 'synonym'
  | 'native'
  | 'register'
  | 'hedging'
  | 'reporting'
  | 'paraphrase'
  | 'discourse'
  | 'polysemy'
  | 'dataCommentary'

export type BankQuestionType =
  | 'meaning'
  | 'form'
  | 'cloze'
  | 'family'
  | 'collocation'
  | 'synonym'
  | 'native'

export type DistractorField = 'glossZh' | 'glossEn' | 'headword' | 'blank' | 'synonym'

/** One authored/generated item in a word's bank. Scheduling is per block, not per word. */
export type QuestionBlock = {
  id: string
  type: BankQuestionType
  wordId: string
  kind: 'mcq' | 'pair'
  prompt?: string
  hint?: string
  speak?: string
  answer?: string
  distractorField?: DistractorField
  optionPool?: string[]
  pair?: Collocation
}

export type McqQuestion = {
  type: 'meaning' | 'form' | 'cloze' | 'family'
  wordId: string
  blockId?: string
  prompt: string
  hint?: string
  speak?: string
  options: string[]
  answer: string
}

export type MatchQuestion = {
  type: 'collocation' | 'synonym' | 'native'
  wordIds: string[]
  blockIds?: string[]
  prompt: string
  pairs: Collocation[]
}

export type Question = McqQuestion | MatchQuestion

export type BlockStat = {
  lastGame: number
  lastCorrect: boolean | null
  consecutiveWrong: number
  seen: number
  dueGame: number
}

export type BankScopeState = {
  gameIndex: number
  stats: Record<string, BlockStat>
}

export type SrsCard = {
  wordId: string
  ease: number
  interval: number
  reps: number
  due: number
}

export type LessonScore = {
  correct: number
  total: number
  at: number
}

export type ProgressState = {
  completedLessons: string[]
  lessonScores: Record<string, LessonScore>
  srs: Record<string, SrsCard>
  bank: Record<string, BankScopeState>
  settings: {
    speech: boolean
  }
}
