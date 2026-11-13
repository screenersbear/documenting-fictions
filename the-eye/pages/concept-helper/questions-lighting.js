// Questions behind "Need to think it through?": Lighting test (the "lighting" flow).
// One of CONCEPT_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.conceptFlows = window.EyeWords.conceptFlows || []).push({
  "id": "lighting",
  "label": "Lighting test",
  "categories": [
    "lighting_test"
  ],
  "start": "lighting_q1",
  "nodes": [
    {
      "id": "lighting_q1",
      "type": "yesno",
      "text": "Are you dialing in one specific look, or comparing a few lighting setups side by side?",
      "key": "multi",
      "yes": "lighting_compare",
      "no": "lighting_look",
      "noLabel": "One look",
      "yesLabel": "Compare"
    },
    {
      "id": "lighting_look",
      "type": "short",
      "text": "What's the look you're testing?",
      "placeholder": "e.g. hard window light",
      "key": "look",
      "next": "lighting_learn"
    },
    {
      "id": "lighting_learn",
      "type": "short",
      "text": "Finish this: I want to figure out…",
      "placeholder": "e.g. how deep the shadows can go",
      "key": "learn",
      "next": "lighting_mood"
    },
    {
      "id": "lighting_compare",
      "type": "short",
      "text": "Which setups are you comparing?",
      "placeholder": "e.g. softbox vs. bare bulb",
      "key": "compare",
      "next": "lighting_learn_compare"
    },
    {
      "id": "lighting_learn_compare",
      "type": "short",
      "text": "Finish this: I want to figure out…",
      "placeholder": "e.g. which one flatters skin",
      "key": "learn",
      "next": "lighting_mood"
    },
    {
      "id": "lighting_mood",
      "type": "short",
      "text": "In a few words, what mood should the light create?",
      "placeholder": "e.g. gritty and noir",
      "key": "mood",
      "next": "lighting_has_ref"
    },
    {
      "id": "lighting_has_ref",
      "type": "yesno",
      "text": "Do you have a reference image or photographer in mind?",
      "key": "hasRef",
      "yes": "lighting_ref",
      "no": "lighting_sitter"
    },
    {
      "id": "lighting_ref",
      "type": "short",
      "text": "Who or what's the reference?",
      "placeholder": "e.g. Peter Lindbergh portraits",
      "key": "ref",
      "next": "lighting_sitter"
    },
    {
      "id": "lighting_sitter",
      "type": "yesno",
      "text": "Last one: are you lighting a stand-in or a mannequin, or a real person sitting in?",
      "key": "sitter",
      "yes": "END",
      "no": "END",
      "yesValue": "on a live model",
      "noValue": "on a stand-in",
      "noLabel": "Stand-in",
      "yesLabel": "Live model"
    }
  ],
  "summaries": [
    {
      "when": {
        "multi": true
      },
      "template": "A side-by-side lighting test[[ of {compare}]][[, shot {sitter}]].[[ It should feel {mood}.]][[ The goal: figure out {learn}.]][[ Think {ref}.]]",
      "pitch": [
        "[[Testing {compare}]][[, to figure out {learn}]].",
        "[[Testing {compare}]][[: {mood}]]."
      ]
    },
    {
      "when": {
        "multi": false
      },
      "template": "A lighting test[[ of {look}]][[, shot {sitter}]].[[ It should feel {mood}.]][[ The goal: figure out {learn}.]][[ Think {ref}.]]",
      "pitch": [
        "[[Testing {look}]][[ like {ref}]][[, to figure out {learn}]].",
        "[[Testing {look}]][[, to figure out {learn}]].",
        "[[Testing {look}]][[: {mood}]]."
      ]
    },
    {
      "when": {},
      "template": "A lighting test[[ of {look}]][[ of {compare}]][[, shot {sitter}]].[[ It should feel {mood}.]][[ The goal: figure out {learn}.]]"
    }
  ]
}
);
