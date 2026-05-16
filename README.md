# Trauma Clarity & Therapy Fit Questionnaire

A static, Singapore-grounded multiple choice questionnaire for trauma clarity, therapy fit, ADHD-friendly support needs, and practical next steps.

This project is intentionally dependency-free. It can run on GitHub Pages without Claude Code, npm, React, Next.js, a backend, or a database.

## What it does

- Presents 20 multiple choice questions.
- Scores practical dimensions such as trauma activation, avoidance, unfinished meaning, relationship repair, ADHD structure needs, help-seeking barriers, and the "small Singapore" threat-map effect.
- Produces a short result that aims to make the user feel understood while giving one eye-opening insight.
- Suggests therapy focus areas and therapist-screening questions.
- Shows Singapore services, crisis resources, and professional directories.
- Keeps answers in the browser. Nothing is submitted to a server.

## File structure

```txt
sg-trauma-clarity-questionnaire/
├── README.md
├── index.html
├── .gitignore
├── .nojekyll
├── data/
│   └── questionnaire.json
├── src/
│   ├── app.js
│   └── scoring.js
└── styles/
    └── styles.css
```

## How to run locally

Do not open `index.html` by double-clicking. Because the app loads `data/questionnaire.json`, run a tiny local server instead:

```bash
python3 -m http.server 8080
```

Then open:

```txt
http://localhost:8080
```

## How to upload to GitHub Pages

1. Create a new GitHub repository.
2. Upload all files and folders in this project.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose the `main` branch and `/root` folder.
6. Save.
7. GitHub will provide a public URL after deployment.

## How to edit the questionnaire

Edit:

```txt
data/questionnaire.json
```

Each question has this shape:

```json
{
  "id": "q1",
  "section": "current_safety",
  "question": "When you think about this person moving back to Singapore, what feels most true right now?",
  "options": [
    {
      "label": "I feel uncomfortable, but I can still function.",
      "scores": {
        "trauma_activation": 1
      }
    }
  ]
}
```

To add a scoring category, add it in `scoringDimensions`, then reference it in option scores.

## How result profiles work

Result profiles live in `data/questionnaire.json` under `resultProfiles`.

A profile can match by:

- `minScores`: the user must score at least these values.
- `maxScores`: the user must score no higher than these values.
- `requiredFlags`: the user must select an answer with that flag.
- `priority`: higher priority profiles show first.

Example:

```json
{
  "id": "quiet_coper",
  "priority": 880,
  "minScores": {
    "help_seeking_barrier": 7
  },
  "title": "You may be a quiet coper",
  "coreInsight": "You can talk about feelings, but you may not ask for help early enough."
}
```

## Clinical and safety note

This project is not a diagnosis, crisis assessment, or substitute for professional care. It is a practical reflection tool.

If someone is in immediate danger or unable to stay safe, they should contact local emergency services, Samaritans of Singapore at 1767, national mindline 1771, or go to the nearest emergency department.

## Suggested next improvements

- Add optional localStorage so users can pause and resume.
- Add a downloadable PDF result summary.
- Add a password gate if the project is deployed publicly but intended for private use.
- Add therapist filtering by modality: EMDR, CPT, trauma-focused CBT, couples therapy, ADHD-informed support, LGBTQ+ affirming care.
- Add analytics only if consent is explicit. Do not collect answer-level data unless there is a very clear privacy policy.
