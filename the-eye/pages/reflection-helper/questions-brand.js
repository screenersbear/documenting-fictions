// Questions behind "Need help reflecting?" (the "brand" flow).
// One of REFLECTION_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.reflectionFlows = window.EyeWords.reflectionFlows || []).push({
  "id": "brand",
  "categories": [
    "branding",
    "commercial",
    "content_shoot"
  ],
  "questions": [
    {
      "field": "right",
      "text": "Which shot will the client love most?",
      "placeholder": "e.g. the founder laughing at the counter",
      "say": "Client favorite: {a}."
    },
    {
      "field": "right",
      "text": "What did you nail from the brief?",
      "placeholder": "e.g. the warm, honest feel",
      "say": "Nailed from the brief: {a}."
    },
    {
      "field": "right",
      "text": "What went smoothly on set?",
      "placeholder": "e.g. product swaps between setups",
      "say": "What ran smoothly: {a}."
    },
    {
      "field": "better",
      "text": "What from the brief or shot list didn't get covered?",
      "placeholder": "e.g. the vertical cuts for stories",
      "say": "Not covered: {a}."
    },
    {
      "field": "better",
      "text": "What slowed you down or got in the way?",
      "placeholder": "e.g. waiting on approvals between setups",
      "say": "What got in the way: {a}."
    },
    {
      "field": "better",
      "text": "What would you shoot differently for how it'll be used?",
      "placeholder": "e.g. more room for text overlays",
      "say": "Shoot differently: {a}."
    },
    {
      "field": "lessons",
      "text": "Finish this: next time, I'll…",
      "placeholder": "e.g. lock the shot list with the client first",
      "say": "Next time, I'll {a}.",
      "lower": true,
      "sayOwn": "Next time, {a}."
    },
    {
      "field": "lessons",
      "text": "What will you ask the client before the next shoot?",
      "placeholder": "e.g. where every image will run",
      "say": "Ask the client first: {a}."
    },
    {
      "field": "lessons",
      "text": "What's one thing you'll keep doing?",
      "placeholder": "e.g. tethering so they can see live",
      "say": "Keep doing: {a}."
    }
  ]
}
);
