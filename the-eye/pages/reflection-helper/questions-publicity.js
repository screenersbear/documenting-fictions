// Questions behind "Need help reflecting?" (the "publicity" flow).
// One of REFLECTION_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.reflectionFlows = window.EyeWords.reflectionFlows || []).push({
  "id": "publicity",
  "categories": [
    "publicity"
  ],
  "questions": [
    {
      "field": "right",
      "text": "Which shot sums them up best?",
      "placeholder": "e.g. the one laughing off-stage",
      "say": "Sums them up: {a}."
    },
    {
      "field": "right",
      "text": "What about their persona came through?",
      "placeholder": "e.g. the dry humor",
      "say": "What came through: {a}."
    },
    {
      "field": "right",
      "text": "What worked with the look, styling or set?",
      "placeholder": "e.g. the red jacket against the brick",
      "say": "What worked: {a}."
    },
    {
      "field": "better",
      "text": "What part of the brief or persona didn't come through?",
      "placeholder": "e.g. the darker, moodier side",
      "say": "Didn't come through: {a}."
    },
    {
      "field": "better",
      "text": "What slowed you down or got in the way?",
      "placeholder": "e.g. the manager cutting the time short",
      "say": "What got in the way: {a}."
    },
    {
      "field": "better",
      "text": "Which looks or crops are missing from the set?",
      "placeholder": "e.g. a clean horizontal for press",
      "say": "Missing: {a}."
    },
    {
      "field": "lessons",
      "text": "Finish this: next time, I'll…",
      "placeholder": "e.g. get the press uses in writing",
      "say": "Next time, I'll {a}.",
      "lower": true,
      "sayOwn": "Next time, {a}."
    },
    {
      "field": "lessons",
      "text": "What will you ask their team before the next shoot?",
      "placeholder": "e.g. which crops the outlets need",
      "say": "Ask their team first: {a}."
    },
    {
      "field": "lessons",
      "text": "What's one thing you'll keep doing?",
      "placeholder": "e.g. a playlist they picked",
      "say": "Keep doing: {a}."
    }
  ]
}
);
