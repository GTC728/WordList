import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FAMILIES } from "./families.mjs";
import seed from "./seed.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src", "data", "courses", "awl");

const NEG_RE = /^(un|dis|mis|non-?|ir|il|im|in)(?=[a-z])/i;
const INFLECT_RE = /(ed|ing|s|es|ies)$/i;
const NOUN_RE =
  /(tion|sion|ment|ity|ness|ance|ence|ism|ship|ology|ologies|lysis|yses|heses|eses|ure|age|cy)$/i;
const ADJ_RE = /(ical|ial|ive|ous|able|ible|ary|ory|ent|ant|al|ic|ful|less)$/i;
const ADV_RE = /ly$/i;
const VERB_RE = /(ise|ize|ate|ify|en)$/i;

const HEAD_ROLE = {
  adjacent: "形容詞",
  albeit: "副詞",
  brief: "形容詞",
  civil: "形容詞",
  complex: "形容詞",
  major: "形容詞",
  minimum: "名詞",
  minor: "形容詞",
  odd: "形容詞",
  plus: "名詞",
  prime: "形容詞",
  sole: "形容詞",
  despite: "副詞",
  forthcoming: "形容詞",
  furthermore: "副詞",
  hence: "副詞",
  integral: "形容詞",
  intermediate: "形容詞",
  likewise: "副詞",
  media: "名詞",
  military: "形容詞",
  nevertheless: "副詞",
  nonetheless: "副詞",
  notwithstanding: "副詞",
  nuclear: "形容詞",
  ongoing: "形容詞",
  overall: "形容詞",
  overseas: "形容詞",
  prior: "形容詞",
  "so-called": "形容詞",
  somewhat: "副詞",
  straightforward: "形容詞",
  thereby: "副詞",
  via: "副詞",
  whereas: "副詞",
  whereby: "副詞",
  widespread: "形容詞",
};

const DISCOURSE = new Set(Object.keys(HEAD_ROLE).filter((k) => HEAD_ROLE[k] === "副詞"));

function isNegative(form, headword) {
  if (form === headword) return false;
  if (headword.startsWith("in") || headword.startsWith("im") || headword.startsWith("un")) {
    return /^(un|dis|mis|non-?)/i.test(form) && !form.startsWith(headword.slice(0, 2));
  }
  if (!NEG_RE.test(form)) return false;
  const rest = form.replace(NEG_RE, "").replace(/^-/, "");
  return rest.startsWith(headword.slice(0, 4)) || headword.startsWith(rest.slice(0, 4));
}

function isAmericanTwin(form, headword, related) {
  if (form === headword) return false;
  const brit = form
    .replace(/izations$/g, "isations")
    .replace(/ization$/g, "isation")
    .replace(/yzing$/g, "ysing")
    .replace(/yzed$/g, "ysed")
    .replace(/yzes$/g, "yses")
    .replace(/yze$/g, "yse")
    .replace(/izing$/g, "ising")
    .replace(/ized$/g, "ised")
    .replace(/izes$/g, "ises")
    .replace(/ize$/g, "ise");
  if (brit !== form && (brit === headword || related.includes(brit))) return true;
  if (form === "labor" || form === "labored" || form === "labors") return true;
  return false;
}

function inferRole(form, headword, related) {
  if (form === headword && HEAD_ROLE[form]) return HEAD_ROLE[form];
  if (DISCOURSE.has(form)) return "副詞";
  if (ADV_RE.test(form) && form !== headword && form.length > headword.length) return "副詞";
  if (NOUN_RE.test(form)) return "名詞";
  if (ADJ_RE.test(form) && !NOUN_RE.test(form)) return "形容詞";
  if (form !== headword && VERB_RE.test(form) && !ADJ_RE.test(form)) return "動詞";

  if (form === headword) {
    const hasEd = related.some(
      (r) =>
        r === `${headword}d` ||
        r === `${headword}ed` ||
        r === headword.replace(/e$/, "ed") ||
        r === headword.replace(/y$/, "ied"),
    );
    const hasIng = related.some(
      (r) =>
        r === `${headword}ing` ||
        r === headword.replace(/e$/, "ing") ||
        r === `${headword}ying`,
    );
    const hasLy = related.includes(`${headword}ly`);
    if (hasLy) return "形容詞";
    if (/(ive|ical|ial|ous|able|ible|al|ic|ary|ent|ant)$/i.test(headword)) return "形容詞";
    if (/(tion|sion|ment|ity|ance|ence|ism|ship|ology|ure|age)$/i.test(headword)) return "名詞";
    if (hasEd || hasIng) return "動詞";
    return "名詞";
  }

  if (/(er|ers|or|ors|ist|ists)$/.test(form)) return "名詞";
  if (INFLECT_RE.test(form)) return inferRole(headword, headword, related);
  return "名詞";
}

function scoreForm(form, headword) {
  if (form === headword) return 100;
  if (ADV_RE.test(form) && form.length > headword.length) return 80;
  if (/(ical|ive)$/i.test(form)) return 78;
  if (NOUN_RE.test(form) && !form.endsWith("s")) return 76;
  if (ADJ_RE.test(form)) return 72;
  if (NOUN_RE.test(form)) return 60;
  if (VERB_RE.test(form)) return 55;
  if (/(er|ers|ist|ists|or|ors)$/i.test(form)) return 40;
  if (INFLECT_RE.test(form)) return 10;
  return 35;
}

function isPluralOf(form, candidates) {
  const set = new Set(candidates);
  if (form.endsWith("ies") && set.has(`${form.slice(0, -3)}y`)) return true;
  if (form.endsWith("ses") && set.has(form.slice(0, -1))) return true;
  if (form.endsWith("es") && set.has(form.slice(0, -2))) return true;
  if (form.endsWith("s") && set.has(form.slice(0, -1))) return true;
  return false;
}

function pickFamily(headword, related, preferred = []) {
  const pool = related.filter((f) => f && f !== headword);
  const distinctive = pool.filter(
    (f) => !isAmericanTwin(f, headword, related) && !isNegative(f, headword),
  );
  const ranked = distinctive
    .filter((f) => !isPluralOf(f, distinctive))
    .sort((a, b) => scoreForm(b, headword) - scoreForm(a, headword) || a.localeCompare(b));

  const extras = [];
  const seenRoles = new Set();
  const tryAdd = (form) => {
    if (!form || form === headword || extras.includes(form) || extras.length >= 3) return;
    if (isAmericanTwin(form, headword, related)) return;
    extras.push(form);
    seenRoles.add(inferRole(form, headword, related));
  };

  for (const form of ranked) {
    const role = inferRole(form, headword, related);
    if (scoreForm(form, headword) <= 10) continue;
    if (!seenRoles.has(role)) tryAdd(form);
  }
  for (const form of ranked) {
    if (scoreForm(form, headword) <= 10) continue;
    tryAdd(form);
  }

  if (extras.length === 0) {
    const negs = pool.filter((f) => isNegative(f, headword));
    tryAdd(ranked[0] || distinctive[0] || negs[0] || pool[0]);
  }

  for (const form of preferred) {
    if (related.includes(form) && !extras.includes(form) && extras.length < 3) tryAdd(form);
    else if (related.includes(form) && extras.length >= 3 && !extras.includes(form)) {
      extras[extras.length - 1] = form;
    }
  }

  const forms = [headword, ...extras].slice(0, 4);
  return forms.map((form) => ({ form, role: inferRole(form, headword, related) }));
}

const QUIZ_FRAMES = {
  名詞: [
    "The chapter closes with a concise {blank} of the remaining gaps.",
    "Reviewers asked for a clearer {blank} before the grant could proceed.",
    "A further {blank} appears in the appendix for comparison.",
  ],
  動詞: [
    "Later teams {blank} the same records with tighter controls.",
    "The authors {blank} this point again in the discussion.",
    "Future work should {blank} these claims against a larger sample.",
  ],
  形容詞: [
    "A more {blank} account is offered in the following section.",
    "The {blank} features of the design deserve closer attention.",
    "Such {blank} evidence is still uncommon in this field.",
  ],
  副詞: [
    "The two cohorts differed {blank} on the second measure.",
    "Results were {blank} consistent across the three sites.",
    "The pattern held {blank} after the outliers were removed.",
  ],
};

function fillBlank(sentence, blank) {
  const count = (sentence.match(/\{blank\}/g) || []).length;
  if (count !== 1) {
    throw new Error(`example must contain {{blank}} once: ${sentence}`);
  }
  return sentence.replace("{blank}", blank);
}

function makeQuiz(headword, family, entry) {
  if (family.length < 2) return undefined;
  if (entry.quiz) {
    const { sentence, blank, role } = entry.quiz;
    if ((sentence.match(/\{blank\}/g) || []).length !== 1) {
      throw new Error(`quiz for ${headword} must contain {{blank}} once`);
    }
    return { sentence, blank, role };
  }
  const target =
    family.find((f) => f.form !== entry.blank && f.form !== headword) ||
    family.find((f) => f.form !== entry.blank) ||
    family[1];
  const frames = QUIZ_FRAMES[target.role] || QUIZ_FRAMES.名詞;
  const sentence = frames[hash(headword) % frames.length];
  return { sentence, blank: target.form, role: target.role };
}

function hash(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return n;
}

function buildCard(headword, info) {
  const entry = seed[headword];
  if (!entry) throw new Error(`missing seed for ${headword}`);
  if ((entry.example.match(/\{blank\}/g) || []).length !== 1) {
    throw new Error(`seed example for ${headword} must contain {{blank}} once`);
  }
  const family = pickFamily(headword, info.related, entry.quiz ? [entry.quiz.blank] : []);
  const card = {
    id: headword,
    headword,
    sublist: info.sublist,
    glossZh: entry.zh,
    glossEn: entry.en,
    family,
    example: {
      en: fillBlank(entry.example, entry.blank),
      blank: entry.blank,
    },
    collocations: (entry.collocations || []).map(([left, right]) => ({ left, right })),
  };
  const familyQuiz = makeQuiz(headword, family, entry);
  if (familyQuiz) card.familyQuiz = familyQuiz;
  return card;
}

const familyKeys = Object.keys(FAMILIES);
const seedKeys = Object.keys(seed);
const missingInSeed = familyKeys.filter((k) => !seed[k]);
const extraInSeed = seedKeys.filter((k) => !FAMILIES[k]);

if (missingInSeed.length || extraInSeed.length) {
  console.error("seed missing from families:", extraInSeed);
  console.error("families missing from seed:", missingInSeed);
  throw new Error("seed and families keys do not match");
}

const bySub = {};
for (const [headword, info] of Object.entries(FAMILIES)) {
  const n = info.sublist;
  (bySub[n] ||= []).push(buildCard(headword, info));
}

mkdirSync(OUT, { recursive: true });

const sublists = [];
for (let n = 1; n <= 10; n++) {
  const words = (bySub[n] || []).sort((a, b) => a.headword.localeCompare(b.headword));
  const expected = n === 10 ? 30 : 60;
  if (words.length !== expected) {
    throw new Error(`sublist ${n} has ${words.length} words, expected ${expected}`);
  }
  const file = `sublist-${String(n).padStart(2, "0")}.json`;
  writeFileSync(join(OUT, file), `${JSON.stringify(words, null, 2)}\n`, "utf8");
  sublists.push({
    n,
    wordCount: words.length,
    lessonCount: n === 10 ? 3 : 6,
  });
}

const meta = {
  id: "awl",
  title: "Academic Word List",
  titleZh: "學術字彙表",
  headwordCount: 570,
  attribution: "Averil Coxhead, Victoria University of Wellington",
  sublists,
};
writeFileSync(join(OUT, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");

const total = sublists.reduce((s, x) => s + x.wordCount, 0);
console.log(`wrote ${total} cards across ${sublists.length} sublist files`);
for (const s of sublists) console.log(`  sublist ${s.n}: ${s.wordCount} words, ${s.lessonCount} lessons`);
