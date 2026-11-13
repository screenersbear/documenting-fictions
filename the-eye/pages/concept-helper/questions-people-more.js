// Questions behind "Need to think it through?": the rest of the "people" flow (after questions-people.js).
window.EyeWords = window.EyeWords || {};
window.EyeWords.conceptFlows.find((f) => f.id === 'people').nodes.push(
  {
    "id": "people_truth",
    "type": "short",
    "text": "What's real about them that should shine through?",
    "placeholder": "e.g. how they bicker over the map",
    "key": "truth",
    "next": "people_era",
    "section": "deeper"
  },
  {
    "id": "people_era",
    "type": "short",
    "text": "What era or time of day is it?",
    "placeholder": "e.g. 1972, golden hour",
    "key": "era",
    "next": "people_props",
    "section": "deeper"
  },
  {
    "id": "people_props",
    "type": "short",
    "text": "Last one: what's around them that tells the story?",
    "placeholder": "e.g. a map nobody can fold",
    "key": "props",
    "next": "END",
    "section": "deeper"
  },
  {
    "id": "people_deeper_theme",
    "type": "yesno",
    "text": "That's your concept. Want to flesh out who they're playing and their world too? It's a few more questions.",
    "key": "deeper",
    "yes": "people_theme_roles",
    "no": "END",
    "section": "deeper"
  },
  {
    "id": "people_theme_roles",
    "type": "short",
    "text": "Who are they being, inside the theme?",
    "placeholder": "e.g. newlyweds in 1955",
    "key": "roles",
    "next": "people_theme_truth",
    "section": "deeper"
  },
  {
    "id": "people_theme_truth",
    "type": "short",
    "text": "What's real about them that should shine through?",
    "placeholder": "e.g. how she bosses him around",
    "key": "truth",
    "next": "people_theme_era",
    "section": "deeper"
  },
  {
    "id": "people_theme_era",
    "type": "short",
    "text": "What era or time of day is it?",
    "placeholder": "e.g. a Sunday afternoon in 1955",
    "key": "era",
    "next": "people_theme_props",
    "section": "deeper"
  },
  {
    "id": "people_theme_props",
    "type": "short",
    "text": "Last one: what's around them that sets the scene?",
    "placeholder": "e.g. a checkered blanket",
    "key": "props",
    "next": "END",
    "section": "deeper"
  }
);
Object.assign(window.EyeWords.conceptFlows.find((f) => f.id === 'people'), {
  "summaries": [
    {
      "when": {
        "style": true
      },
      "template": "A candid session[[ of them being {them}]][[, built around {ritual}]][[ at {place}]].[[ Don't miss {moment}.]][[ It should feel {feel}.]]",
      "pitch": [
        "[[{ritual}]][[ at {place}]][[: just them, {them}]].",
        "[[{ritual}]][[: just them, {them}]].",
        "[[Just them, {them}]]."
      ],
      "character": [
        "[[Who's who: {who}.]][[ Day to day, they're {them}.]][[ You can tell they love each other because {love}.]][[ What they'd wear on a perfect day off: {wear}.]]"
      ],
      "world": [
        "[[Their world: {home}.]][[ The place that means something: {place}.]][[ Their thing together: {ritual}.]][[ Most like them: {season}.]]"
      ]
    },
    {
      "when": {
        "style": false,
        "story": true
      },
      "template": "A styled little story[[ about {plot}]][[, {real}]][[, set at {setting}]][[, with the look of {look}]].[[ It should feel {feel}.]]",
      "pitch": [
        "[[{plot}]][[ at {setting}]][[, shot like {look}]].",
        "[[{plot}]][[ at {setting}]].",
        "[[{plot}]]."
      ],
      "character": [
        "[[In the story, they're {roles}.]][[ More than anything, they want {want}.]][[ What's really them: {truth}.]]"
      ],
      "world": [
        "[[The story: {plot}.]][[ Set at {setting}.]][[ When: {era}.]][[ In the frame: {props}.]][[ The look: {look}.]]"
      ]
    },
    {
      "when": {
        "style": false,
        "story": false
      },
      "template": "A styled session[[ built around {theme}]][[, a nod to {link}]][[, set at {setting}]][[, with the look of {look}]].[[ It should feel {feel}.]]",
      "pitch": [
        "[[{theme}]][[ at {setting}]][[, a nod to {link}]].",
        "[[{theme}]][[, a nod to {link}]].",
        "[[{theme}]][[ at {setting}]].",
        "[[{theme}]]."
      ],
      "character": [
        "[[Inside the theme, they're {roles}.]][[ What's really them: {truth}.]]"
      ],
      "world": [
        "[[The theme: {theme}.]][[ Set at {setting}.]][[ When: {era}.]][[ In the frame: {props}.]][[ The look: {look}.]][[ A nod to {link}.]]"
      ]
    },
    {
      "when": {},
      "template": "A session that's true to who they are[[, set at {setting}]][[ at {place}]].[[ It should feel {feel}.]]"
    }
  ],
  "deeper": [
    {
      "when": {
        "style": true
      },
      "start": "people_deeper_candid"
    },
    {
      "when": {
        "style": false,
        "story": true
      },
      "start": "people_deeper_story"
    },
    {
      "when": {
        "style": false,
        "story": false
      },
      "start": "people_deeper_theme"
    }
  ]
});
