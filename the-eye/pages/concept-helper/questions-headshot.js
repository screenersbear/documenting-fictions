// Questions behind "Need to think it through?": Headshot (the "headshot" flow).
// One of CONCEPT_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.conceptFlows = window.EyeWords.conceptFlows || []).push({
  "id": "headshot",
  "label": "Headshot",
  "categories": [
    "headshot"
  ],
  "start": "headshot_q1",
  "nodes": [
    {
      "id": "headshot_q1",
      "type": "yesno",
      "text": "Are these headshots for work or a personal brand, or for acting and modeling, like casting and agent submissions?",
      "key": "acting",
      "yes": "headshot_actor",
      "no": "headshot_who",
      "noLabel": "Work & brand",
      "yesLabel": "Acting"
    },
    {
      "id": "headshot_actor",
      "type": "short",
      "text": "Who's in front of the camera, in a few words?",
      "placeholder": "e.g. a stage actor in her 20s",
      "key": "who",
      "next": "headshot_roles"
    },
    {
      "id": "headshot_roles",
      "type": "short",
      "text": "What kinds of roles should these get them called in for?",
      "placeholder": "e.g. quirky best-friend roles",
      "key": "roles",
      "next": "headshot_looks"
    },
    {
      "id": "headshot_looks",
      "type": "yesno",
      "text": "One strong, consistent look, or two: a bright commercial one and a moodier theatrical one?",
      "key": "looks",
      "yes": "headshot_words",
      "no": "headshot_words",
      "yesValue": "Two looks: bright commercial and moody theatrical",
      "noValue": "One strong, consistent look",
      "noLabel": "One look",
      "yesLabel": "Two looks"
    },
    {
      "id": "headshot_who",
      "type": "short",
      "text": "What do they do, in a few words?",
      "placeholder": "e.g. a family law attorney",
      "key": "who",
      "next": "headshot_takeaway"
    },
    {
      "id": "headshot_takeaway",
      "type": "short",
      "text": "What should it say about how they work?",
      "hint": "The one thing a client should pick up at a glance.",
      "placeholder": "e.g. they really listen",
      "key": "takeaway",
      "next": "headshot_where"
    },
    {
      "id": "headshot_where",
      "type": "short",
      "text": "Where will it be used?",
      "placeholder": "e.g. LinkedIn and their site",
      "key": "where",
      "next": "headshot_setting"
    },
    {
      "id": "headshot_setting",
      "type": "yesno",
      "text": "Should it be in their own space, or on a clean backdrop?",
      "hint": "Their own space means their office, studio, shop, wherever they work.",
      "key": "setting",
      "yes": "headshot_polish",
      "no": "headshot_polish",
      "yesValue": "on a clean backdrop",
      "noValue": "in their own space",
      "noLabel": "Own space",
      "yesLabel": "Backdrop"
    },
    {
      "id": "headshot_polish",
      "type": "yesno",
      "text": "Should it feel relaxed and natural, or classic and polished?",
      "key": "polish",
      "yes": "headshot_words",
      "no": "headshot_words",
      "yesValue": "classic, polished",
      "noValue": "relaxed, natural",
      "noLabel": "Relaxed",
      "yesLabel": "Polished"
    },
    {
      "id": "headshot_words",
      "type": "short",
      "text": "Last one: three words for how they should come across?",
      "placeholder": "e.g. warm, sharp, wry",
      "key": "words",
      "next": "END"
    }
  ],
  "summaries": [
    {
      "when": {
        "acting": true
      },
      "template": "Casting headshots[[ for {who}]][[, to land {roles}]].[[ {looks}.]][[ They should come across {words}.]]",
      "pitch": [
        "[[{who}]][[, ready for {roles}]][[: {words}]].",
        "[[{who}]][[, ready for {roles}]].",
        "[[{who}]][[: {words}]]."
      ]
    },
    {
      "when": {
        "acting": false
      },
      "template": "A[[ {polish}]] headshot[[ for {who}]][[, {setting}]].[[ At a glance: {takeaway}.]][[ They should come across {words}.]][[ Made for {where}.]]",
      "pitch": [
        "[[{who}]][[: {words}]][[. At a glance: {takeaway}]].",
        "[[{who}]][[. At a glance: {takeaway}]].",
        "[[{who}]][[: {words}]]."
      ]
    },
    {
      "when": {},
      "template": "A[[ {polish}]] headshot[[ for {who}]].[[ They should come across {words}.]]"
    }
  ]
}
);
