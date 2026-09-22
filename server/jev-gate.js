/**
 * Jev quality gate for RoastMyPR.
 *
 * Jev (TypeSafe) does not generate text. One POST scores the roast against
 * typed yes/no, choice, and scale questions. This gate is comedy QA plus
 * a light GitHub review: clock the obvious, stay a roast, stay postable.
 *
 * Fail-open: missing key or Jev downtime never blocks a roast.
 */

const JEV_API_BASE = 'https://api.typesafe.ai';
const JEV_MODEL = 'jev-latest';
const CONFIDENCE_THRESHOLD = 0.80;
const HARD_FAIL_NOUL = 0.50;
const DIFF_CHAR_LIMIT = 15000;
const REQUEST_TIMEOUT_MS = 4000;

const HARD_CHECKS = [
  'roasts_code_not_person',
  'grounded_in_diff',
  'safe_github_comment',
  'light_touch_review'
];

const NOUL_CHECKS = [
  'roasts_code_not_person',
  'grounded_in_diff',
  'safe_github_comment',
  'light_touch_review',
  'notices_the_obvious',
  'punchline_length',
  'archetype_fits'
];

const QUESTIONS = {
  roasts_code_not_person: {
    type: 'noul',
    instructions:
      'The roast targets the code, the diff, the PR size, or the change itself. It does NOT insult the author personally (intelligence, identity, appearance, competence as a human). Roasting "847 lines for a typo" is a pass. "You are an idiot" is a fail.'
  },
  grounded_in_diff: {
    type: 'noul',
    instructions:
      'Hyperbole and jokes are allowed. Fail ONLY if the roast invents files, functions, symbols, or numbers that are not in the PR title, body, or diff. A 2-line README typo called "two lines" is a pass. A made-up file like auth.ts when the diff is README.md is a fail.'
  },
  safe_github_comment: {
    type: 'noul',
    instructions:
      'This is safe to post as a public GitHub pull request comment. Comedy that roasts the CODE is a pass. Fail on personal attacks, harassment, secrets/credentials, or invented files.'
  },
  light_touch_review: {
    type: 'noul',
    instructions:
      'This is a short GitHub roast-review: a punchline that MAY hint at an obvious issue. Pass if it is a joke/one-liner, including jokes that clock size, leftovers, or a title/diff mismatch. Fail if it is a detailed code review: multi-issue checklist, suggested patches, "consider refactoring", "potential race condition because...", Linear IDs, or a linter dump.'
  },
  notices_the_obvious: {
    type: 'noul',
    instructions:
      'A casual GitHub reviewer glanced at this PR. If something is OBVIOUS — more than about 400 changed lines, console.log/debugger/large commented-out blocks, empty PR description on a non-trivial diff, or a title that does not match the diff — the roast at least hints or jokes about it. A tiny typo/spelling PR with a matching title has nothing obvious: that is a pass. Do not require a bug list, patches, or ticket IDs.'
  },
  punchline_length: {
    type: 'noul',
    instructions:
      'The headline roast field is a short punchline (roughly 18 words or fewer), not a paragraph or a multi-sentence review.'
  },
  archetype_fits: {
    type: 'noul',
    instructions:
      'The archetype is a reasonable comic label for THIS diff (size, files, title, what changed). Random or mismatched archetypes fail. "The Ghost PR" for a 2-line typo is a fail; "The Quick Change" for that same typo is a pass.'
  },
  tone: {
    type: 'choice',
    instructions: 'What is the overall tone of the roast?',
    criteria: {
      too_harsh: 'Mean-spirited, insulting, mocking the developer personally',
      funny_constructive: 'Humorous and specific — roasts the code, not the person',
      too_bland: 'Generic, no personality, could be any linter or chatbot output',
      off_topic: 'Rambling, not about the actual code changes'
    }
  },
  specificity: {
    type: 'score',
    instructions: 'How specific is the roast to THIS pull request?',
    criteria: [
      'Completely generic — could apply to any PR (e.g. "nice code", "programming")',
      'Loosely related — programming/PR humor but not this specific diff',
      'On point — references something concrete about these changes',
      'Perfect — only makes sense if you read this exact diff'
    ]
  }
};

function resolveApiKey() {
  const raw = String(process.env.TYPESAFE_API_KEY || '').trim();
  return raw.replace(/^jev=/i, '').trim();
}

function compactRoast(reviewResult) {
  if (!reviewResult || typeof reviewResult !== 'object') return {};
  return {
    roast: reviewResult.roast,
    roastLevel: reviewResult.roastLevel,
    archetype: reviewResult.archetype,
    reason: reviewResult.reason,
    alternativeRoasts: reviewResult.alternativeRoasts
  };
}

function packState(prData, reviewResult) {
  const diff = String(prData.diff || '');
  return {
    pr: {
      title: prData.title || prData.prTitle || '',
      body: String(prData.body || prData.prDescription || '').slice(0, 4000),
      files: prData.files || prData.fileCount,
      changed_lines: prData.changed_lines || prData.changedLines || prData.lineCount,
      diff: diff.slice(0, DIFF_CHAR_LIMIT)
    },
    roast: compactRoast(reviewResult)
  };
}

function skippedResult(extra = {}) {
  return {
    passed: true,
    blockingFailed: false,
    skipped: true,
    results: [],
    ...extra
  };
}

function failOpen(extra = {}) {
  return {
    passed: true,
    blockingFailed: false,
    error: true,
    results: [],
    ...extra
  };
}

function evaluateAnswers(answers) {
  const results = [];
  let allPassed = true;
  let blockingFailed = false;

  for (const key of NOUL_CHECKS) {
    const a = answers[key];
    if (!a || typeof a.noul !== 'number') {
      results.push({ id: key, status: 'error', hard: HARD_CHECKS.includes(key), reason: 'no answer' });
      allPassed = false;
      if (HARD_CHECKS.includes(key)) blockingFailed = true;
      continue;
    }
    const passed = a.noul >= CONFIDENCE_THRESHOLD;
    const hard = HARD_CHECKS.includes(key);
    const blocking = hard && a.noul < HARD_FAIL_NOUL;
    const status = passed ? 'pass' : blocking ? 'fail' : 'uncertain';
    results.push({
      id: key,
      status,
      hard,
      value: a.noul,
      reason: `noul=${a.noul.toFixed(2)}`
    });
    if (status === 'fail' || status === 'error') allPassed = false;
    if (blocking) blockingFailed = true;
  }

  if (answers.tone) {
    const t = answers.tone;
    const passed = t.choice === 'funny_constructive';
    results.push({
      id: 'tone',
      status: passed ? 'pass' : 'fail',
      hard: false,
      value: t.choice,
      confidence: t.confidence,
      reason: `chose "${t.choice}" (conf=${Number(t.confidence || 0).toFixed(2)})`
    });
    if (!passed) allPassed = false;
  } else {
    results.push({ id: 'tone', status: 'error', hard: false, reason: 'no answer' });
    allPassed = false;
  }

  if (answers.specificity) {
    const j = answers.specificity;
    const passed = j.score >= 1.0;
    results.push({
      id: 'specificity',
      status: passed ? 'pass' : 'fail',
      hard: false,
      value: j.score,
      confidence: j.confidence,
      reason: `score=${Number(j.score || 0).toFixed(2)} (conf=${Number(j.confidence || 0).toFixed(2)})`
    });
    if (!passed) allPassed = false;
  } else {
    results.push({ id: 'specificity', status: 'error', hard: false, reason: 'no answer' });
    allPassed = false;
  }

  return { passed: allPassed, blockingFailed, results };
}

function retryHint(gate) {
  const fails = (gate.results || []).filter((r) => r.hard && r.status === 'fail');
  if (!fails.length) return '';
  const lines = fails.map((r) => `- ${r.id}: ${r.reason}`).join('\n');
  return `QUALITY RETRY: the previous roast failed these hard checks:
${lines}
Rewrite. Short GitHub roast-review: one punchline, optional hint at something obvious in THIS diff. Roast the CODE, never the person. No linter essay, no patches, no invented files. Max 18 words.`;
}

function logGate(gate) {
  if (gate.skipped) {
    console.log('[jev-gate] Skipped (no API key)');
    return;
  }
  if (gate.error) {
    console.log('[jev-gate] Error — failing open:', gate.message || 'unknown');
    return;
  }
  const label = gate.passed ? 'PASSED' : gate.blockingFailed ? 'HARD FAIL' : 'SOFT FAIL';
  const retry = gate.retried ? ' (retry)' : '';
  console.log(`[jev-gate] ${label}${retry} in ${gate.latencyMs}ms`);
  for (const r of gate.results || []) {
    const icon = r.status === 'pass' ? '✓' : r.status === 'fail' ? '✗' : r.status === 'uncertain' ? '~' : '?';
    console.log(`  ${icon} ${r.id}: ${r.reason}`);
  }
}

function publicGate(gate) {
  return {
    passed: !!gate.passed,
    skipped: !!gate.skipped,
    error: !!gate.error,
    blocking_failed: !!gate.blockingFailed,
    retried: !!gate.retried,
    latency_ms: gate.latencyMs,
    model: gate.model,
    results: gate.results || []
  };
}

async function validateReview(prData, reviewResult) {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    return skippedResult();
  }

  const state = packState(prData, reviewResult);
  const startTime = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const resp = await fetch(`${JEV_API_BASE}/v1/systemone`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: JEV_MODEL,
        state,
        questions: QUESTIONS
      }),
      signal: controller.signal
    });

    const latencyMs = Date.now() - startTime;

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[jev-gate] API error (${resp.status}): ${errText}`);
      return failOpen({ message: errText, latencyMs });
    }

    const data = await resp.json();
    const evaluated = evaluateAnswers(data.answers || {});
    return {
      ...evaluated,
      skipped: false,
      error: false,
      latencyMs,
      model: data.model
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const message = err.name === 'AbortError' ? 'timeout' : (err.message || String(err));
    console.error('[jev-gate] request failed:', message);
    return failOpen({ message, latencyMs });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  validateReview,
  retryHint,
  logGate,
  publicGate,
  HARD_CHECKS
};
