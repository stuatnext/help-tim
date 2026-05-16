import { calculateResult, formatDimensionLabel } from './scoring.js';

const state = {
  config: null,
  currentIndex: 0,
  selections: {}
};

const els = {
  intro: document.querySelector('#intro'),
  app: document.querySelector('#app'),
  results: document.querySelector('#results'),
  startButton: document.querySelector('#startButton'),
  previousButton: document.querySelector('#previousButton'),
  nextButton: document.querySelector('#nextButton'),
  restartButton: document.querySelector('#restartButton'),
  printButton: document.querySelector('#printButton'),
  copyBriefButton: document.querySelector('#copyBriefButton'),
  questionCounter: document.querySelector('#questionCounter'),
  progressFill: document.querySelector('#progressFill'),
  questionCard: document.querySelector('#questionCard'),
  resultContent: document.querySelector('#resultContent'),
  appTitle: document.querySelector('#appTitle'),
  privacyNote: document.querySelector('#privacyNote')
};

async function init() {
  try {
    const response = await fetch('./data/questionnaire.json');
    if (!response.ok) throw new Error(`Could not load questionnaire: ${response.status}`);
    state.config = await response.json();
    els.appTitle.textContent = state.config.title;
    els.privacyNote.textContent = state.config.privacyNote;
    wireEvents();
  } catch (error) {
    document.body.innerHTML = `
      <main class="shell">
        <section class="panel">
          <h1>Questionnaire could not load</h1>
          <p>This project needs to be opened through a small local server or GitHub Pages, not double-clicked as a local file.</p>
          <pre>python3 -m http.server 8080</pre>
          <p>Then open <strong>http://localhost:8080</strong>.</p>
          <p class="muted">${escapeHtml(error.message)}</p>
        </section>
      </main>
    `;
  }
}

function wireEvents() {
  els.startButton.addEventListener('click', startQuestionnaire);
  els.previousButton.addEventListener('click', goPrevious);
  els.nextButton.addEventListener('click', goNext);
  els.restartButton.addEventListener('click', restart);
  els.printButton.addEventListener('click', () => window.print());
  els.copyBriefButton.addEventListener('click', copyTherapistBrief);
}

function startQuestionnaire() {
  els.intro.hidden = true;
  els.app.hidden = false;
  renderQuestion();
}

function renderQuestion() {
  const question = state.config.questions[state.currentIndex];
  const selectedIndex = state.selections[question.id];
  const questionNumber = state.currentIndex + 1;
  const total = state.config.questions.length;
  const progress = (questionNumber / total) * 100;

  els.questionCounter.textContent = `Question ${questionNumber} of ${total}`;
  els.progressFill.style.width = `${progress}%`;
  els.previousButton.disabled = state.currentIndex === 0;
  els.nextButton.textContent = state.currentIndex === total - 1 ? 'See my results' : 'Next';
  els.nextButton.disabled = selectedIndex === undefined;

  els.questionCard.innerHTML = `
    <p class="eyebrow">${formatSection(question.section)}</p>
    <h2>${escapeHtml(question.question)}</h2>
    <div class="options" role="radiogroup" aria-label="${escapeHtml(question.question)}">
      ${question.options.map((option, index) => optionTemplate(question.id, option, index, selectedIndex)).join('')}
    </div>
  `;

  els.questionCard.querySelectorAll('[data-option-index]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selections[question.id] = Number(button.dataset.optionIndex);
      renderQuestion();
    });
  });
}

function optionTemplate(questionId, option, index, selectedIndex) {
  const selected = selectedIndex === index;
  return `
    <button class="option ${selected ? 'selected' : ''}" type="button" role="radio" aria-checked="${selected}" data-question-id="${questionId}" data-option-index="${index}">
      <span class="option-marker">${selected ? '✓' : ''}</span>
      <span>${escapeHtml(option.label)}</span>
    </button>
  `;
}

function goPrevious() {
  if (state.currentIndex === 0) return;
  state.currentIndex -= 1;
  renderQuestion();
}

function goNext() {
  const total = state.config.questions.length;
  if (state.currentIndex < total - 1) {
    state.currentIndex += 1;
    renderQuestion();
    return;
  }
  showResults();
}

function showResults() {
  const result = calculateResult(state.config, state.selections);
  window.currentResult = result;

  els.app.hidden = true;
  els.results.hidden = false;
  els.resultContent.innerHTML = resultTemplate(result);
}

function resultTemplate(result) {
  const primary = result.primaryProfiles[0] || fallbackProfile(result);
  const secondary = result.primaryProfiles[1];
  const hasUrgentFlag = result.flags.includes('urgent_support') || (result.scores.safety_risk || 0) >= 5;

  return `
    <section class="result-hero ${hasUrgentFlag ? 'urgent' : ''}">
      <p class="eyebrow">What this seems to be telling you</p>
      <h2>${escapeHtml(primary.title)}</h2>
      <p>${escapeHtml(state.config.finalOutputStyle.openingLine)}</p>
    </section>

    <section class="grid two">
      ${profileCard(primary, 'The main pattern')}
      ${secondary ? profileCard(secondary, 'Also showing up') : scoreCard(result)}
    </section>

    <section class="panel">
      <h3>The hidden piece</h3>
      <p class="large">${escapeHtml(primary.hiddenLearning || primary.coreInsight)}</p>
    </section>

    <section class="grid two">
      <div class="panel">
        <h3>What to try this week</h3>
        ${listTemplate(result.actions)}
      </div>
      <div class="panel">
        <h3>Therapy focus to look for</h3>
        ${pillListTemplate(result.therapyFocus)}
      </div>
    </section>

    <section class="panel">
      <h3>Questions to ask a therapist</h3>
      ${listTemplate(result.therapistQuestions)}
    </section>

    ${result.therapistBrief ? `
      <section class="panel brief-panel">
        <h3>Short message he can send to a therapist</h3>
        <blockquote id="therapistBrief">${escapeHtml(result.therapistBrief)}</blockquote>
      </section>
    ` : ''}

    <section class="panel">
      <h3>Singapore services and directories to check</h3>
      <p class="muted">These are starting points, not endorsements. Verify credentials, modality, fees, availability, and personal fit before booking.</p>
      <div class="resources">
        ${result.resources.map(resourceTemplate).join('')}
      </div>
    </section>

    <details class="panel details-panel">
      <summary>Show score breakdown</summary>
      ${scoreBreakdownTemplate(result)}
    </details>

    <section class="panel smallprint">
      <h3>Important note</h3>
      <p>${escapeHtml(state.config.clinicalDisclaimer)}</p>
      <p>${escapeHtml(state.config.emergencyNote)}</p>
    </section>
  `;
}

function profileCard(profile, label) {
  return `
    <article class="panel insight-card">
      <p class="eyebrow">${escapeHtml(label)}</p>
      <h3>${escapeHtml(profile.title)}</h3>
      <p>${escapeHtml(profile.heardStatement || profile.coreInsight)}</p>
    </article>
  `;
}

function scoreCard(result) {
  return `
    <article class="panel insight-card">
      <p class="eyebrow">Most active areas</p>
      <h3>What scored highest</h3>
      ${pillListTemplate(result.topDimensions.map((item) => `${item.label}: ${item.score}`))}
    </article>
  `;
}

function fallbackProfile(result) {
  const top = result.topDimensions[0];
  return {
    title: top ? `${top.label} seems most active` : 'You have completed the questionnaire',
    coreInsight: 'Your answers show enough signal to take into a structured therapy conversation.',
    heardStatement: 'The next step is not to solve everything alone. It is to convert what you noticed into a clear support plan.',
    hiddenLearning: 'Sometimes the breakthrough is not a dramatic new memory. It is realising which coping strategy has been quietly running the show.'
  };
}

function scoreBreakdownTemplate(result) {
  return `
    <div class="score-grid">
      ${Object.entries(result.scores)
        .sort((a, b) => b[1] - a[1])
        .map(([dimension, score]) => `
          <div class="score-row">
            <span>${escapeHtml(formatDimensionLabel(dimension))}</span>
            <strong>${score}</strong>
          </div>
        `)
        .join('')}
    </div>
  `;
}

function resourceTemplate(resource) {
  return `
    <article class="resource-card">
      <div>
        <h4><a href="${escapeAttribute(resource.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(resource.name)}</a></h4>
        <p class="muted">${escapeHtml(resource.type)}</p>
        <p>${escapeHtml(resource.notes)}</p>
      </div>
    </article>
  `;
}

function listTemplate(items) {
  if (!items || items.length === 0) return '<p class="muted">No items available.</p>';
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function pillListTemplate(items) {
  if (!items || items.length === 0) return '<p class="muted">No focus areas available.</p>';
  return `<div class="pill-list">${items.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join('')}</div>`;
}

async function copyTherapistBrief() {
  const brief = document.querySelector('#therapistBrief');
  if (!brief) return;
  await navigator.clipboard.writeText(brief.innerText);
  els.copyBriefButton.textContent = 'Copied';
  setTimeout(() => {
    els.copyBriefButton.textContent = 'Copy therapist brief';
  }, 1500);
}

function restart() {
  state.currentIndex = 0;
  state.selections = {};
  els.results.hidden = true;
  els.intro.hidden = false;
  els.copyBriefButton.textContent = 'Copy therapist brief';
}

function formatSection(section) {
  return section
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

init();
