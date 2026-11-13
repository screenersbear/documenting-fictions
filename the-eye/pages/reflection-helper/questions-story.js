// Questions behind "Need help reflecting?" (the "story" flow).
// One of REFLECTION_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.reflectionFlows = window.EyeWords.reflectionFlows || []).push({
  "id": "story",
  "categories": [
    "editorial",
    "portfolio_building",
    "test_shoot",
    "other",
    ""
  ],
  "questions": [
    {
      "field": "right",
      "text": "Which shot or moment came out best?",
      "placeholder": "e.g. the shot through the motel window",
      "say": "Best shot: {a}."
    },
    {
      "field": "right",
      "text": "What part of the idea came through strongest?",
      "placeholder": "e.g. the loneliness, in the empty pool",
      "say": "What came through: {a}."
    },
    {
      "field": "right",
      "text": "What worked best with the talent: styling, light, performance?",
      "placeholder": "e.g. her stillness between takes",
      "say": "What worked best: {a}."
    },
    {
      "field": "better",
      "text": "What slowed you down or got in the way?",
      "placeholder": "e.g. wardrobe changes took forever",
      "say": "What got in the way: {a}."
    },
    {
      "field": "better",
      "text": "Which shot didn't come out the way you pictured?",
      "placeholder": "e.g. the car scene felt staged",
      "say": "Didn't land: {a}."
    },
    {
      "field": "better",
      "text": "What do you wish you'd had on set?",
      "placeholder": "e.g. a haze machine for the hallway",
      "say": "Wish I'd had: {a}."
    },
    {
      "field": "lessons",
      "text": "Finish this: next time, I'll…",
      "placeholder": "e.g. scout at the same hour I shoot",
      "say": "Next time, I'll {a}.",
      "lower": true,
      "sayOwn": "Next time, {a}."
    },
    {
      "field": "lessons",
      "text": "What's one thing you'll keep doing?",
      "placeholder": "e.g. shooting the warm-up shots",
      "say": "Keep doing: {a}."
    },
    {
      "field": "lessons",
      "text": "What would you tell yourself the night before?",
      "placeholder": "e.g. simplify the shot list",
      "say": "Note to self: {a}."
    }
  ]
}
);
