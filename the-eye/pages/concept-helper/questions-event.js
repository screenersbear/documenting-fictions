// Questions behind "Need to think it through?": Event: find the theme (the "event" flow).
// One of CONCEPT_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.conceptFlows = window.EyeWords.conceptFlows || []).push({
  "id": "event",
  "label": "Event: find the theme",
  "categories": [
    "event"
  ],
  "start": "event_q1",
  "nodes": [
    {
      "id": "event_q1",
      "type": "yesno",
      "text": "Is this {category} centered on a stage, with performers or speakers everyone's watching?",
      "hint": "Yes for gigs, shows, talks and recitals. No for parties, openings and mixers.",
      "key": "stage",
      "yes": "event_show",
      "no": "event_occasion"
    },
    {
      "id": "event_show",
      "type": "short",
      "text": "What's the show, in a few words?",
      "hint": "A gig, a keynote, a recital, a comedy night…",
      "placeholder": "e.g. a sold-out punk show",
      "key": "what",
      "next": "event_show_theme"
    },
    {
      "id": "event_show_theme",
      "type": "short",
      "text": "In a few words, what's the theme or energy you want to bottle up?",
      "hint": "You can't script it, so pick the thread you'll follow.",
      "placeholder": "e.g. electric, sweaty joy",
      "key": "theme",
      "next": "event_side"
    },
    {
      "id": "event_side",
      "type": "yesno",
      "text": "Are you telling it from the stage's side, or the crowd's?",
      "hint": "Pick the stage if you'll be with the performers: on stage, in the wings, backstage.",
      "key": "crowd",
      "yes": "event_crowd_motif",
      "no": "event_stage_motif",
      "noLabel": "The stage",
      "yesLabel": "The crowd"
    },
    {
      "id": "event_crowd_motif",
      "type": "short",
      "text": "What will you keep hunting for in the crowd?",
      "hint": "A recurring detail that ties the whole set together.",
      "placeholder": "e.g. hands in the air",
      "key": "motif",
      "next": "event_show_moment"
    },
    {
      "id": "event_stage_motif",
      "type": "short",
      "text": "What will you keep hunting for on stage and behind it?",
      "hint": "A recurring detail that ties the whole set together.",
      "placeholder": "e.g. sweat under hot lights",
      "key": "motif",
      "next": "event_show_moment"
    },
    {
      "id": "event_show_moment",
      "type": "short",
      "text": "Which moment can't you miss?",
      "hint": "Know when it's coming so you're already in position.",
      "placeholder": "e.g. the encore",
      "key": "moment",
      "next": "event_candid"
    },
    {
      "id": "event_occasion",
      "type": "short",
      "text": "What's the occasion, in a few words?",
      "hint": "A party, a gala, a launch, an opening…",
      "placeholder": "e.g. a rooftop 40th",
      "key": "what",
      "next": "event_eyes"
    },
    {
      "id": "event_eyes",
      "type": "short",
      "text": "Whose eyes are you telling it through?",
      "hint": "The host, the guest of honor, the guests, even the staff.",
      "placeholder": "e.g. the birthday girl",
      "key": "who",
      "next": "event_theme"
    },
    {
      "id": "event_theme",
      "type": "short",
      "text": "In a few words, what's the theme or energy you want to bottle up?",
      "hint": "You can't script it, so pick the thread you'll follow.",
      "placeholder": "e.g. glamour with a wink",
      "key": "theme",
      "next": "event_planned"
    },
    {
      "id": "event_planned",
      "type": "yesno",
      "text": "Is there a big planned moment, like a toast, a reveal or a cake cutting?",
      "hint": "Say no if it's more of a hang with no real run-of-show.",
      "key": "planned",
      "yes": "event_moment",
      "no": "event_inbetween"
    },
    {
      "id": "event_moment",
      "type": "short",
      "text": "Which moment can't you miss?",
      "hint": "Know when it's coming so you're already in position.",
      "placeholder": "e.g. the surprise toast",
      "key": "moment",
      "next": "event_motif"
    },
    {
      "id": "event_inbetween",
      "type": "short",
      "text": "Then it lives in the in-between. What should you watch for?",
      "placeholder": "e.g. old friends catching up",
      "key": "inbetween",
      "next": "event_motif"
    },
    {
      "id": "event_motif",
      "type": "short",
      "text": "What small detail will you keep coming back to?",
      "hint": "A recurring detail that ties the whole set together.",
      "placeholder": "e.g. string lights",
      "key": "motif",
      "next": "event_candid"
    },
    {
      "id": "event_candid",
      "type": "yesno",
      "text": "Last one: will you grab some posed shots too, or keep it all candid?",
      "key": "candid",
      "yes": "END",
      "no": "END",
      "yesValue": "fly-on-the-wall",
      "noValue": "mostly candid",
      "noLabel": "Some posed",
      "yesLabel": "All candid"
    }
  ],
  "summaries": [
    {
      "when": {
        "stage": true,
        "crowd": true
      },
      "template": "[[{theme}: ]]a[[ {candid}]] look[[ at {what}]], told from the crowd.[[ Keep coming back to {motif}.]][[ Don't miss {moment}.]]",
      "pitch": [
        "[[{what}]], from the crowd[[: {theme}]].",
        "[[{what}]], from the crowd."
      ]
    },
    {
      "when": {
        "stage": true,
        "crowd": false
      },
      "template": "[[{theme}: ]]a[[ {candid}]] look[[ at {what}]], told from the stage and the wings.[[ Keep coming back to {motif}.]][[ Don't miss {moment}.]]",
      "pitch": [
        "[[{what}]], from the stage and the wings[[: {theme}]].",
        "[[{what}]], from the stage and the wings."
      ]
    },
    {
      "when": {
        "stage": false,
        "planned": true
      },
      "template": "[[{theme}: ]]a[[ {candid}]] look[[ at {what}]][[, through the eyes of {who}]].[[ Keep coming back to {motif}.]][[ Don't miss {moment}.]]",
      "pitch": [
        "[[{what}]][[ through the eyes of {who}]][[: {theme}]].",
        "[[{what}]][[: {theme}]].",
        "[[{what}]][[ through the eyes of {who}]]."
      ]
    },
    {
      "when": {
        "stage": false,
        "planned": false
      },
      "template": "[[{theme}: ]]a[[ {candid}]] look[[ at {what}]][[, through the eyes of {who}]].[[ Keep coming back to {motif}.]][[ Watch the in-between: {inbetween}.]]",
      "pitch": [
        "[[{what}]][[ through the eyes of {who}]][[: {theme}]].",
        "[[{what}]][[: {theme}]].",
        "[[{what}]][[ through the eyes of {who}]]."
      ]
    },
    {
      "when": {},
      "template": "[[{theme}: ]]event coverage[[ of {what}]][[, through the eyes of {who}]][[, shot {candid}]].[[ Keep coming back to {motif}.]][[ Don't miss {moment}.]][[ Watch the in-between: {inbetween}.]]"
    }
  ]
}
);
