// Questions behind "Need help reflecting?" (the "video" flow).
// One of REFLECTION_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.reflectionFlows = window.EyeWords.reflectionFlows || []).push({
  "id": "video",
  "categories": [
    "video"
  ],
  "questions": [
    {
      "field": "right",
      "text": "Which shot or scene came out best?",
      "placeholder": "e.g. the slow push-in at the gym door",
      "say": "Best shot: {a}."
    },
    {
      "field": "right",
      "text": "What went smoothly with the crew or the schedule?",
      "placeholder": "e.g. we wrapped the interviews early",
      "say": "What ran smoothly: {a}."
    },
    {
      "field": "right",
      "text": "What worked better than planned?",
      "placeholder": "e.g. the handheld, run-and-gun bits",
      "say": "Better than planned: {a}."
    },
    {
      "field": "better",
      "text": "What went wrong with sound, light or footage?",
      "placeholder": "e.g. wind noise on the outdoor takes",
      "say": "Sound, light or footage trouble: {a}."
    },
    {
      "field": "better",
      "text": "Where, if anywhere, did the schedule slip?",
      "placeholder": "e.g. the company move took an hour",
      "say": "Where the schedule slipped: {a}."
    },
    {
      "field": "better",
      "text": "Which shot from the list didn't you get?",
      "placeholder": "e.g. the wide establishing shot",
      "say": "Didn't get: {a}."
    },
    {
      "field": "lessons",
      "text": "Finish this: next time, I'll…",
      "placeholder": "e.g. record room tone at every location",
      "say": "Next time, I'll {a}.",
      "lower": true,
      "sayOwn": "Next time, {a}."
    },
    {
      "field": "lessons",
      "text": "What would you change about the crew or gear?",
      "placeholder": "e.g. add a dedicated sound person",
      "say": "Crew or gear change: {a}."
    },
    {
      "field": "lessons",
      "text": "What's one thing you'll keep doing?",
      "placeholder": "e.g. a shot list per location",
      "say": "Keep doing: {a}."
    }
  ]
}
);
