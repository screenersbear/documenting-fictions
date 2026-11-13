// Questions behind "Need help reflecting?" (the "lighting" flow).
// One of REFLECTION_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.reflectionFlows = window.EyeWords.reflectionFlows || []).push({
  "id": "lighting",
  "categories": [
    "lighting_test"
  ],
  "questions": [
    {
      "field": "right",
      "text": "Which setup won, and why?",
      "placeholder": "e.g. the bare bulb, for the hard edges",
      "say": "Winner: {a}."
    },
    {
      "field": "right",
      "text": "What surprised you in a good way?",
      "placeholder": "e.g. how flattering the bounce was",
      "say": "Nice surprise: {a}."
    },
    {
      "field": "right",
      "text": "What settings or placement do you want to remember?",
      "placeholder": "e.g. key at 45°, f/8, 1/125",
      "say": "Worth remembering: {a}."
    },
    {
      "field": "better",
      "text": "Which setup didn't work, and why?",
      "placeholder": "e.g. the softbox looked flat",
      "say": "Didn't work: {a}."
    },
    {
      "field": "better",
      "text": "What got in the way of a clean test?",
      "placeholder": "e.g. the window light kept changing",
      "say": "What got in the way: {a}."
    },
    {
      "field": "better",
      "text": "What would you change about how you ran the test?",
      "placeholder": "e.g. change one thing at a time",
      "say": "Run it differently: {a}."
    },
    {
      "field": "lessons",
      "text": "Finish this: next time, I'll…",
      "placeholder": "e.g. label every shot with the setup",
      "say": "Next time, I'll {a}.",
      "lower": true,
      "sayOwn": "Next time, {a}."
    },
    {
      "field": "lessons",
      "text": "Where will you use what you learned?",
      "placeholder": "e.g. the moody portrait series",
      "say": "Where I'll use it: {a}."
    },
    {
      "field": "lessons",
      "text": "What do you still want to test?",
      "placeholder": "e.g. a grid on the hair light",
      "say": "Still to test: {a}."
    }
  ]
}
);
