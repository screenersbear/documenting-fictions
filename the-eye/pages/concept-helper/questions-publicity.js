// Questions behind "Need to think it through?": Publicity (the "publicity" flow).
// One of CONCEPT_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.conceptFlows = window.EyeWords.conceptFlows || []).push({
  "id": "publicity",
  "label": "Publicity",
  "categories": [
    "publicity"
  ],
  "start": "publicity_q1",
  "nodes": [
    {
      "id": "publicity_q1",
      "type": "yesno",
      "text": "Is this for a specific release or announcement?",
      "hint": "Like an album, a book, a film, a tour or an opening.",
      "key": "release",
      "yes": "publicity_news",
      "no": "publicity_who"
    },
    {
      "id": "publicity_news",
      "type": "short",
      "text": "What's being announced, in a few words?",
      "placeholder": "e.g. her debut album",
      "key": "news",
      "next": "publicity_who"
    },
    {
      "id": "publicity_who",
      "type": "short",
      "text": "Who's in the spotlight, in a few words?",
      "placeholder": "e.g. an indie folk singer",
      "key": "who",
      "next": "publicity_scene"
    },
    {
      "id": "publicity_scene",
      "type": "yesno",
      "text": "Should they be on a simple backdrop, or in a scene?",
      "hint": "A scene builds a world around them. A backdrop keeps it all about them.",
      "key": "scene",
      "yes": "publicity_world",
      "no": "publicity_takeaway",
      "noLabel": "Backdrop",
      "yesLabel": "A scene"
    },
    {
      "id": "publicity_world",
      "type": "short",
      "text": "Where are we, in a few words?",
      "hint": "A place, a time, a world.",
      "placeholder": "e.g. a smoky jazz club",
      "key": "world",
      "next": "publicity_takeaway"
    },
    {
      "id": "publicity_takeaway",
      "type": "short",
      "text": "At a glance, what should these photos say?",
      "placeholder": "e.g. this era is darker",
      "key": "takeaway",
      "next": "publicity_words"
    },
    {
      "id": "publicity_words",
      "type": "short",
      "text": "Three words for their public persona?",
      "placeholder": "e.g. witty, magnetic, strange",
      "key": "words",
      "next": "publicity_polish"
    },
    {
      "id": "publicity_polish",
      "type": "yesno",
      "text": "Last one: should it look raw and lived-in, or glossy and polished?",
      "key": "polish",
      "yes": "END",
      "no": "END",
      "yesValue": "polished",
      "noValue": "raw, lived-in",
      "noLabel": "Lived-in",
      "yesLabel": "Glossy"
    },
    {
      "id": "publicity_deeper",
      "type": "yesno",
      "text": "That's your concept. Want to sketch out their persona and world too? It's a few more questions.",
      "key": "deeper",
      "yes": "publicity_persona",
      "no": "END",
      "section": "deeper"
    },
    {
      "id": "publicity_persona",
      "type": "short",
      "text": "Finish this: in these photos, they're the kind of person who…",
      "placeholder": "e.g. never explains the joke",
      "key": "persona",
      "next": "publicity_detail",
      "section": "deeper"
    },
    {
      "id": "publicity_detail",
      "type": "short",
      "text": "What's one signature detail of their look?",
      "placeholder": "e.g. a red guitar strap",
      "key": "detail",
      "next": "publicity_props",
      "section": "deeper"
    },
    {
      "id": "publicity_props",
      "type": "short",
      "text": "What's around them that says who they are?",
      "placeholder": "e.g. stacks of vinyl, a busted amp",
      "key": "props",
      "next": "publicity_era",
      "section": "deeper"
    },
    {
      "id": "publicity_era",
      "type": "short",
      "text": "Last one: what era or time of day does it feel like?",
      "placeholder": "e.g. the '70s, last call",
      "key": "era",
      "next": "END",
      "section": "deeper"
    },
    {
      "id": "publicity_bd_deeper",
      "type": "yesno",
      "text": "That's your concept. Want to sketch out their persona and look too? It's a few more questions.",
      "key": "deeper",
      "yes": "publicity_bd_persona",
      "no": "END",
      "section": "deeper"
    },
    {
      "id": "publicity_bd_persona",
      "type": "short",
      "text": "Finish this: in these photos, they're the kind of person who…",
      "placeholder": "e.g. never explains the joke",
      "key": "persona",
      "next": "publicity_bd_detail",
      "section": "deeper"
    },
    {
      "id": "publicity_bd_detail",
      "type": "short",
      "text": "What's one signature detail of their look?",
      "placeholder": "e.g. a red guitar strap",
      "key": "detail",
      "next": "publicity_bd_props",
      "section": "deeper"
    },
    {
      "id": "publicity_bd_props",
      "type": "short",
      "text": "What could they hold or have with them that says who they are?",
      "placeholder": "e.g. a battered setlist",
      "key": "props",
      "next": "publicity_bd_era",
      "section": "deeper"
    },
    {
      "id": "publicity_bd_era",
      "type": "short",
      "text": "Last one: what era does their styling nod to?",
      "placeholder": "e.g. '70s folk records",
      "key": "era",
      "next": "END",
      "section": "deeper"
    }
  ],
  "summaries": [
    {
      "when": {
        "scene": true
      },
      "template": "[[{polish} ]]press photos[[ of {who}]][[ for {news}]][[, set in {world}]].[[ At a glance: {takeaway}.]][[ Their persona: {words}.]]",
      "pitch": [
        "[[{who}]][[ in {world}]][[, for {news}]][[: {takeaway}]].",
        "[[{who}]][[ in {world}]][[, for {news}]].",
        "[[{who}]][[, for {news}]][[: {takeaway}]].",
        "[[{who}]][[, for {news}]]."
      ],
      "character": [
        "[[{who}]].[[ They're the kind of person who {persona}.]][[ Their public persona: {words}.]][[ Signature detail: {detail}.]]"
      ],
      "world": [
        "[[Set in {world}]].[[ When: {era}.]][[ Around them: {props}.]][[ At a glance: {takeaway}.]]"
      ]
    },
    {
      "when": {
        "scene": false
      },
      "template": "[[{polish} ]]press portraits[[ of {who}]][[ for {news}]], on a simple backdrop.[[ At a glance: {takeaway}.]][[ Their persona: {words}.]]",
      "pitch": [
        "[[{who}]][[, for {news}]][[: {takeaway}]].",
        "[[{who}]][[, for {news}]].",
        "[[{who}]][[: {takeaway}]]."
      ],
      "character": [
        "[[{who}]].[[ They're the kind of person who {persona}.]][[ Their public persona: {words}.]][[ Signature detail: {detail}.]]"
      ],
      "world": [
        "On a simple backdrop.[[ Styling nods to {era}.]][[ With them: {props}.]][[ At a glance: {takeaway}.]]"
      ]
    },
    {
      "when": {},
      "template": "[[{polish} ]]press photos[[ of {who}]][[ for {news}]].[[ At a glance: {takeaway}.]][[ Their persona: {words}.]]"
    }
  ],
  "deeper": [
    {
      "when": {
        "scene": true
      },
      "start": "publicity_deeper"
    },
    {
      "when": {
        "scene": false
      },
      "start": "publicity_bd_deeper"
    }
  ]
}
);
