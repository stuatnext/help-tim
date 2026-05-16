export function calculateResult(config, selections) {
  const scores = Object.fromEntries(Object.keys(config.scoringDimensions).map((key) => [key, 0]));
  const flags = new Set();
  const modalities = new Set();
  const selectedAnswers = [];

  for (const question of config.questions) {
    const optionIndex = selections[question.id];
    if (optionIndex === undefined || optionIndex === null) continue;

    const option = question.options[optionIndex];
    selectedAnswers.push({
      questionId: question.id,
      section: question.section,
      question: question.question,
      answer: option.label
    });

    if (option.flag) flags.add(option.flag);
    if (Array.isArray(option.suggestedModalities)) {
      option.suggestedModalities.forEach((modality) => modalities.add(modality));
    }

    for (const [dimension, value] of Object.entries(option.scores || {})) {
      scores[dimension] = (scores[dimension] || 0) + value;
    }
  }

  const matchedProfiles = getMatchedProfiles(config.resultProfiles, scores, flags);
  const primaryProfiles = matchedProfiles.slice(0, 2);
  const topDimensions = getTopDimensions(scores, 4);
  const resourceTags = new Set(primaryProfiles.flatMap((profile) => profile.resourceTags || []));
  const resources = selectResources(config.resources, resourceTags, config.finalOutputStyle.maxResources);
  const actions = unique(primaryProfiles.flatMap((profile) => profile.actions || [])).slice(0, config.finalOutputStyle.maxActionItems);
  const therapyFocus = unique([
    ...primaryProfiles.flatMap((profile) => profile.therapyFocus || []),
    ...Array.from(modalities)
  ]).slice(0, 6);

  const therapistQuestions = selectTherapistQuestions(config, primaryProfiles);
  const therapistBrief = primaryProfiles
    .map((profile) => profile.therapistBrief)
    .filter(Boolean)
    .join('\n\n');

  return {
    scores,
    flags: Array.from(flags),
    topDimensions,
    matchedProfiles,
    primaryProfiles,
    actions,
    therapyFocus,
    therapistQuestions,
    therapistBrief,
    resources,
    selectedAnswers
  };
}

function getMatchedProfiles(profiles, scores, flags) {
  return profiles
    .filter((profile) => profileMatches(profile, scores, flags))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

function profileMatches(profile, scores, flags) {
  const requiredFlags = profile.requiredFlags || [];
  const flagMatches = requiredFlags.some((flag) => flags.has(flag));
  const minMatches = scoreMinimumsMatch(profile.minScores, scores);
  const maxMatches = scoreMaximumsMatch(profile.maxScores, scores);

  if (profile.matchMode === 'any') {
    const hasMinScores = profile.minScores && Object.keys(profile.minScores).length > 0;
    const hasRequiredFlags = requiredFlags.length > 0;
    const anyCoreMatch = (hasRequiredFlags && flagMatches) || (hasMinScores && minMatches);
    return anyCoreMatch && maxMatches;
  }

  return requiredFlags.every((flag) => flags.has(flag)) && minMatches && maxMatches;
}

function scoreMinimumsMatch(minScores = {}, scores) {
  return Object.entries(minScores).every(([dimension, minimum]) => (scores[dimension] || 0) >= minimum);
}

function scoreMaximumsMatch(maxScores = {}, scores) {
  return Object.entries(maxScores).every(([dimension, maximum]) => (scores[dimension] || 0) <= maximum);
}

export function getTopDimensions(scores, limit = 4) {
  return Object.entries(scores)
    .filter(([dimension]) => dimension !== 'safety_risk')
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([dimension, score]) => ({
      dimension,
      score,
      label: formatDimensionLabel(dimension)
    }));
}

function selectTherapistQuestions(config, profiles) {
  const profileQuestions = [];

  for (const profile of profiles) {
    if ((profile.resourceTags || []).includes('adhd')) {
      profileQuestions.push('Can you support ADHD with written summaries, visual structure, and clear homework?');
    }
    if ((profile.resourceTags || []).includes('trauma') || (profile.resourceTags || []).includes('emdr')) {
      profileQuestions.push('How do you decide whether to begin with stabilisation or trauma processing?');
    }
    if ((profile.resourceTags || []).includes('couples')) {
      profileQuestions.push('Can you help me separate individual trauma recovery from relationship repair and accountability?');
    }
  }

  return unique([...profileQuestions, ...config.therapistScreeningQuestions]).slice(0, config.finalOutputStyle.maxTherapistQuestions);
}

function selectResources(resources, preferredTags, limit) {
  const crisis = resources.filter((resource) => (resource.tags || []).includes('crisis'));
  const matched = resources.filter((resource) =>
    (resource.tags || []).some((tag) => preferredTags.has(tag)) && !(resource.tags || []).includes('crisis')
  );
  const directories = resources.filter((resource) => (resource.tags || []).includes('directory'));

  return uniqueByUrl([...crisis, ...matched, ...directories, ...resources]).slice(0, limit);
}

export function formatDimensionLabel(dimension) {
  return dimension
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function uniqueByUrl(resources) {
  const seen = new Set();
  const output = [];
  for (const resource of resources) {
    if (seen.has(resource.url)) continue;
    seen.add(resource.url);
    output.push(resource);
  }
  return output;
}
