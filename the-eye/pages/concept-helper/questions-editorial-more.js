// Questions behind "Need to think it through?": the rest of the "editorial" flow (after questions-editorial.js).
window.EyeWords = window.EyeWords || {};
Object.assign(window.EyeWords.conceptFlows.find((f) => f.id === 'editorial'), {
  "summaries": [
    {
      "when": {
        "mode": "story"
      },
      "template": "An editorial[[ about {character}]][[, caught {action}]][[ {timing} {moment}]][[, set in {world}]][[, with {styling} styling]].[[ It should feel {feeling}.]]",
      "pitch": [
        "[[{character}]][[, caught {action}]][[ {timing} {moment}]][[, in {world}]].",
        "[[{character}]][[, caught {action}]][[ {timing} {moment}]].",
        "[[{character}]][[, caught {action}]].",
        "[[{character}]][[ in {world}]]."
      ],
      "character": [
        "[[{character}]][[, caught {action}]].[[ More than anything, they want {want}.]][[ What they'd never say out loud: {secret}.]][[ The detail that gives them away: {detail}.]]"
      ],
      "world": [
        "[[Set in {world}]][[, {timing} {moment}]].[[ In the frame: {props}.]][[ Right after the last frame, {after}.]]"
      ]
    },
    {
      "when": {
        "mode": "vibe"
      },
      "template": "[[{mood}: ]]a mood piece[[ set in {place}]][[, bathed in {light}]][[, with {styling} styling]].[[ Think {refs}.]][[ It should leave you {takeaway}.]]",
      "pitch": [
        "[[{place}]][[, bathed in {light}]][[: {mood}]].",
        "[[{place}]][[: {mood}]].",
        "[[{place}]][[, bathed in {light}]]."
      ],
      "character": [
        "[[{figure}]].[[ Deep down, they're feeling {inner}.]][[ The detail that sets the mood: {detail}.]]"
      ],
      "world": [
        "[[Set in {place}]][[, bathed in {light}]].[[ When: {era}.]][[ In the frame: {props}.]][[ Think {refs}.]]"
      ]
    },
    {
      "when": {},
      "template": "An editorial[[ with {styling} styling]].[[ It should feel {feeling}.]][[ It should feel {mood}.]]"
    }
  ],
  "deeper": [
    {
      "when": {
        "mode": "story"
      },
      "start": "editorial_deeper_story"
    },
    {
      "when": {
        "mode": "vibe"
      },
      "start": "editorial_deeper_vibe"
    }
  ]
});
