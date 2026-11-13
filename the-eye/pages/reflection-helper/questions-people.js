// Questions behind "Need help reflecting?" (the "people" flow).
// One of REFLECTION_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.reflectionFlows = window.EyeWords.reflectionFlows || []).push({
  "id": "people",
  "categories": [
    "engagement",
    "family",
    "maternity"
  ],
  "questions": [
    {
      "field": "right",
      "text": "Which moment or expression came out best?",
      "placeholder": "e.g. the quiet laugh by the window",
      "say": "Best moment: {a}."
    },
    {
      "field": "right",
      "text": "What got them relaxed and being themselves?",
      "placeholder": "e.g. letting the kids pick the music",
      "say": "What got them comfortable: {a}."
    },
    {
      "field": "right",
      "text": "Which prompt or idea worked better than expected?",
      "placeholder": "e.g. the 'whisper a secret' prompt",
      "say": "Prompt that worked: {a}."
    },
    {
      "field": "better",
      "text": "When, if ever, did things stall or feel stiff?",
      "placeholder": "e.g. the posed group shots at the start",
      "say": "Where it stalled: {a}."
    },
    {
      "field": "better",
      "text": "What about the timing, light or location made it harder?",
      "placeholder": "e.g. the sun dropped behind the trees early",
      "say": "What made it harder: {a}."
    },
    {
      "field": "better",
      "text": "What did you miss or run out of time for?",
      "placeholder": "e.g. a photo with just the grandparents",
      "say": "Missed: {a}."
    },
    {
      "field": "lessons",
      "text": "Finish this: next time, I'll…",
      "placeholder": "e.g. start with movement, not posing",
      "say": "Next time, I'll {a}.",
      "lower": true,
      "sayOwn": "Next time, {a}."
    },
    {
      "field": "lessons",
      "text": "What will you tell clients like them before the shoot?",
      "placeholder": "e.g. bring snacks for the kids",
      "say": "Tell clients beforehand: {a}."
    },
    {
      "field": "lessons",
      "text": "What's one thing you'll keep doing?",
      "placeholder": "e.g. starting with a walk to warm up",
      "say": "Keep doing: {a}."
    }
  ]
}
);
