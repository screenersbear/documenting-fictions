// Questions behind "Need help reflecting?" (the "wedding" flow).
// One of REFLECTION_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.reflectionFlows = window.EyeWords.reflectionFlows || []).push({
  "id": "wedding",
  "categories": [
    "wedding"
  ],
  "questions": [
    {
      "field": "right",
      "text": "Which moment of the day came out best?",
      "placeholder": "e.g. dad seeing her for the first time",
      "say": "Best moment: {a}."
    },
    {
      "field": "right",
      "text": "What went smoothly with the timeline or the team?",
      "placeholder": "e.g. the planner kept portraits on time",
      "say": "What ran smoothly: {a}."
    },
    {
      "field": "right",
      "text": "Which usually-hard part of the day did you nail?",
      "placeholder": "e.g. the dark reception, with off-camera flash",
      "say": "Nailed: {a}."
    },
    {
      "field": "better",
      "text": "Where, if anywhere, did the timeline slip or squeeze you?",
      "placeholder": "e.g. portraits got cut to ten minutes",
      "say": "Where the timeline slipped: {a}."
    },
    {
      "field": "better",
      "text": "What was hard about the light or the venue?",
      "placeholder": "e.g. a dark church with no flash allowed",
      "say": "Light or venue trouble: {a}."
    },
    {
      "field": "better",
      "text": "Which moment or must-have shot did you miss?",
      "placeholder": "e.g. the cake cutting, I was outside",
      "say": "Missed: {a}."
    },
    {
      "field": "lessons",
      "text": "Finish this: next time, I'll…",
      "placeholder": "e.g. ask for 20 minutes at golden hour",
      "say": "Next time, I'll {a}.",
      "lower": true,
      "sayOwn": "Next time, {a}."
    },
    {
      "field": "lessons",
      "text": "What will you ask the couple or planner for earlier?",
      "placeholder": "e.g. the full family formals list",
      "say": "Ask earlier: {a}."
    },
    {
      "field": "lessons",
      "text": "What would you bring or set up differently?",
      "placeholder": "e.g. a second body with a wide lens",
      "say": "Bring or set up differently: {a}."
    }
  ]
}
);
