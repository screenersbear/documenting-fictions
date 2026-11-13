// Questions behind "Need to think it through?": the rest of the "wedding" flow (after questions-wedding.js).
window.EyeWords = window.EyeWords || {};
Object.assign(window.EyeWords.conceptFlows.find((f) => f.id === 'wedding'), {
  "summaries": [
    {
      "when": {
        "real": true
      },
      "template": "A[[ {approach}]] take on their wedding day[[, centered on {thread}]][[, honoring {ritual}]].[[ Don't miss {moment}.]][[ It should feel {feel}.]]",
      "pitch": [
        "Their wedding day[[, following {thread}]][[, honoring {ritual}]].",
        "Their wedding day[[, following {thread}]].",
        "Their wedding day[[, honoring {ritual}]]."
      ],
      "character": [
        "[[The two of them: {couple}.]][[ You can tell they love each other because {love}.]][[ Who else matters most: {people}.]]"
      ],
      "world": [
        "[[The venue: {venue}.]][[ When: {era}.]][[ The thread through the day: {thread}.]][[ Traditions to honor: {ritual}.]]"
      ]
    },
    {
      "when": {
        "real": false,
        "story": true
      },
      "template": "A styled wedding story[[ about {plot}]][[, set at {setting}]][[, with the look of {look}]].[[ It should feel {feel}.]]",
      "pitch": [
        "[[{plot}]][[ at {setting}]][[, shot like {look}]].",
        "[[{plot}]][[ at {setting}]].",
        "[[{plot}]]."
      ],
      "character": [
        "[[In the story: {roles}.]][[ More than anything, they want {want}.]][[ The detail that gives them away: {detail}.]]"
      ],
      "world": [
        "[[The story: {plot}.]][[ Set at {setting}.]][[ When: {era}.]][[ In the frame: {props}.]][[ The look: {look}.]]"
      ]
    },
    {
      "when": {
        "real": false,
        "story": false
      },
      "template": "A styled wedding shoot[[ built around {theme}]][[, set at {setting}]][[, with the look of {look}]].[[ It should feel {feel}.]]",
      "pitch": [
        "[[{theme}]][[ at {setting}]][[, shot like {look}]].",
        "[[{theme}]][[ at {setting}]].",
        "[[{theme}]]."
      ],
      "character": [
        "[[Inside the theme: {roles}.]][[ The detail that sells it: {detail}.]]"
      ],
      "world": [
        "[[The theme: {theme}.]][[ Set at {setting}.]][[ When: {era}.]][[ In the frame: {props}.]][[ The look: {look}.]]"
      ]
    },
    {
      "when": {},
      "template": "A wedding shoot that's true to the couple[[, centered on {thread}]][[, built around {theme}]].[[ It should feel {feel}.]]"
    }
  ],
  "deeper": [
    {
      "when": {
        "real": true
      },
      "start": "wedding_deeper_real"
    },
    {
      "when": {
        "real": false,
        "story": true
      },
      "start": "wedding_deeper_story"
    },
    {
      "when": {
        "real": false,
        "story": false
      },
      "start": "wedding_deeper_theme"
    }
  ]
});
