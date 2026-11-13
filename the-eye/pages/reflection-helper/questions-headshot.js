// Questions behind "Need help reflecting?" (the "headshot" flow).
// One of REFLECTION_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.reflectionFlows = window.EyeWords.reflectionFlows || []).push({
  "id": "headshot",
  "categories": [
    "headshot"
  ],
  "questions": [
    {
      "field": "right",
      "text": "Which expression or look came out best?",
      "placeholder": "e.g. the half-smile in the second look",
      "say": "Best look: {a}."
    },
    {
      "field": "right",
      "text": "What got them comfortable in front of the camera?",
      "placeholder": "e.g. talking about their dog",
      "say": "What got them comfortable: {a}."
    },
    {
      "field": "right",
      "text": "What worked about the setup or light?",
      "placeholder": "e.g. the big window plus a white bounce",
      "say": "What worked: {a}."
    },
    {
      "field": "better",
      "text": "When did they tense up, or what didn't land?",
      "placeholder": "e.g. the serious, arms-crossed shots",
      "say": "What didn't land: {a}."
    },
    {
      "field": "better",
      "text": "What slowed you down?",
      "placeholder": "e.g. re-lighting for each outfit",
      "say": "What slowed me down: {a}."
    },
    {
      "field": "better",
      "text": "What about the background, styling or retouching would you fix?",
      "placeholder": "e.g. a wrinkled collar",
      "say": "To fix: {a}."
    },
    {
      "field": "lessons",
      "text": "Finish this: next time, I'll…",
      "placeholder": "e.g. send a what-to-wear guide",
      "say": "Next time, I'll {a}.",
      "lower": true,
      "sayOwn": "Next time, {a}."
    },
    {
      "field": "lessons",
      "text": "What will you tell the next client beforehand?",
      "placeholder": "e.g. bring two tops in solid colors",
      "say": "Tell clients beforehand: {a}."
    },
    {
      "field": "lessons",
      "text": "What's one thing you'll keep doing?",
      "placeholder": "e.g. showing them the back of the camera",
      "say": "Keep doing: {a}."
    }
  ]
}
);
