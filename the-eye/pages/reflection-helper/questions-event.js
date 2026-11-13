// Questions behind "Need help reflecting?" (the "event" flow).
// One of REFLECTION_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.reflectionFlows = window.EyeWords.reflectionFlows || []).push({
  "id": "event",
  "categories": [
    "event"
  ],
  "questions": [
    {
      "field": "right",
      "text": "Which moment came out best?",
      "placeholder": "e.g. the surprise toast, right on cue",
      "say": "Best moment: {a}."
    },
    {
      "field": "right",
      "text": "When were you in the right place at the right time?",
      "placeholder": "e.g. by the stage door for the entrance",
      "say": "Right place, right time: {a}."
    },
    {
      "field": "right",
      "text": "What captured the energy of it best?",
      "placeholder": "e.g. wide shots from the balcony",
      "say": "What captured the energy: {a}."
    },
    {
      "field": "better",
      "text": "Where were you out of position, or what did you miss?",
      "placeholder": "e.g. stuck at the bar during the speech",
      "say": "Missed: {a}."
    },
    {
      "field": "better",
      "text": "What made the light or the room hard to work with?",
      "placeholder": "e.g. purple uplights on every face",
      "say": "Light or room trouble: {a}."
    },
    {
      "field": "better",
      "text": "What slowed you down?",
      "placeholder": "e.g. swapping lenses in a crowd",
      "say": "What slowed me down: {a}."
    },
    {
      "field": "lessons",
      "text": "Finish this: next time, I'll…",
      "placeholder": "e.g. get the run-of-show a day early",
      "say": "Next time, I'll {a}.",
      "lower": true,
      "sayOwn": "Next time, {a}."
    },
    {
      "field": "lessons",
      "text": "What will you ask the host or organizer beforehand?",
      "placeholder": "e.g. who the VIPs are",
      "say": "Ask beforehand: {a}."
    },
    {
      "field": "lessons",
      "text": "What would you bring or set up differently?",
      "placeholder": "e.g. a flash with a bounce card",
      "say": "Bring or set up differently: {a}."
    }
  ]
}
);
