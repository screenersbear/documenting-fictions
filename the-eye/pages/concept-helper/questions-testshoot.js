// Questions behind "Need to think it through?": Test shoot: story or vibe (the "testshoot" flow).
// One of CONCEPT_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.conceptFlows = window.EyeWords.conceptFlows || []).push({
  "id": "testshoot",
  "label": "Test shoot: story or vibe",
  "categories": [
    "test_shoot"
  ],
  "start": "testshoot_mode",
  "nodes": [
    {
      "id": "testshoot_mode",
      "type": "yesno",
      "text": "Is this {category} a story with a beginning, middle and end, or more of a vibe?",
      "hint": "Tests are a great place to chase a pure vibe. No wrong answer.",
      "key": "mode",
      "yes": "testshoot_mood",
      "no": "testshoot_who",
      "yesValue": "vibe",
      "noValue": "story",
      "noLabel": "A story",
      "yesLabel": "A vibe"
    },
    {
      "id": "testshoot_who",
      "type": "short",
      "text": "Who's the main character, in a few words?",
      "hint": "Who they're playing, not who's modeling.",
      "placeholder": "e.g. a pageant queen",
      "key": "character",
      "next": "testshoot_doing"
    },
    {
      "id": "testshoot_doing",
      "type": "short",
      "text": "What do we catch them doing?",
      "hint": "One action, like a film still.",
      "placeholder": "e.g. eating cake alone",
      "key": "action",
      "next": "testshoot_after"
    },
    {
      "id": "testshoot_after",
      "type": "yesno",
      "text": "Are we meeting them just before something big happens, or just after?",
      "key": "timing",
      "yes": "testshoot_moment",
      "no": "testshoot_moment",
      "yesValue": "just after",
      "noValue": "just before",
      "noLabel": "Before",
      "yesLabel": "After"
    },
    {
      "id": "testshoot_moment",
      "type": "short",
      "text": "What's the big moment, in a few words?",
      "hint": "It can be tiny: a phone call, a slammed door.",
      "placeholder": "e.g. losing the crown",
      "key": "moment",
      "next": "testshoot_world"
    },
    {
      "id": "testshoot_world",
      "type": "short",
      "text": "Where and when does it take place?",
      "hint": "A place, an era, or both.",
      "placeholder": "e.g. a '90s rec center",
      "key": "world",
      "next": "testshoot_feel"
    },
    {
      "id": "testshoot_feel",
      "type": "short",
      "text": "In a few words, how should it feel?",
      "placeholder": "e.g. funny but sad",
      "key": "feeling",
      "next": "testshoot_testing"
    },
    {
      "id": "testshoot_mood",
      "type": "short",
      "text": "In a few words, how should it feel?",
      "placeholder": "e.g. warm and sleepy",
      "key": "mood",
      "next": "testshoot_light"
    },
    {
      "id": "testshoot_light",
      "type": "short",
      "text": "What's the light and color like?",
      "hint": "Think palette and light, not gear.",
      "placeholder": "e.g. golden, grainy light",
      "key": "light",
      "next": "testshoot_place"
    },
    {
      "id": "testshoot_place",
      "type": "short",
      "text": "Where's it set?",
      "hint": "A real spot or just the kind of place.",
      "placeholder": "e.g. a sunlit greenhouse",
      "key": "place",
      "next": "testshoot_refs"
    },
    {
      "id": "testshoot_refs",
      "type": "short",
      "text": "Any era, movie or reference it's borrowing from?",
      "hint": "A decade, a film, a painter, a photographer. Or just say none.",
      "placeholder": "e.g. Sofia Coppola",
      "key": "refs",
      "next": "testshoot_leave"
    },
    {
      "id": "testshoot_leave",
      "type": "short",
      "text": "Finish this: it should leave you…",
      "placeholder": "e.g. wanting to slow down",
      "key": "takeaway",
      "next": "testshoot_testing"
    },
    {
      "id": "testshoot_testing",
      "type": "short",
      "text": "Last one: what are you testing or trying for the first time?",
      "hint": "A look, a technique, new gear, a new face or team.",
      "placeholder": "e.g. a new film stock",
      "key": "testing",
      "next": "END"
    },
    {
      "id": "testshoot_deeper_story",
      "type": "yesno",
      "text": "That's your concept. Want to flesh out the character and their world too? It's a few more questions.",
      "key": "deeper",
      "yes": "testshoot_dp_want",
      "no": "END",
      "section": "deeper"
    },
    {
      "id": "testshoot_dp_want",
      "type": "short",
      "text": "Finish this: more than anything, they want…",
      "placeholder": "e.g. to be seen without the sash",
      "key": "want",
      "next": "testshoot_dp_secret",
      "section": "deeper"
    },
    {
      "id": "testshoot_dp_secret",
      "type": "short",
      "text": "Finish this: what they'd never say out loud is…",
      "placeholder": "e.g. she's relieved it's over",
      "key": "secret",
      "next": "testshoot_dp_detail",
      "section": "deeper"
    },
    {
      "id": "testshoot_dp_detail",
      "type": "short",
      "text": "What's one detail of how they look that tells their story?",
      "placeholder": "e.g. mascara running, smile fixed",
      "key": "detail",
      "next": "testshoot_dp_props",
      "section": "deeper"
    },
    {
      "id": "testshoot_dp_props",
      "type": "short",
      "text": "What's around them that hints at what happened?",
      "placeholder": "e.g. a deflated balloon arch",
      "key": "props",
      "next": "testshoot_dp_after",
      "section": "deeper"
    },
    {
      "id": "testshoot_dp_after",
      "type": "short",
      "text": "Last one: what happens right after the last frame?",
      "placeholder": "e.g. she eats the whole cake",
      "key": "after",
      "next": "END",
      "section": "deeper"
    },
    {
      "id": "testshoot_deeper_vibe",
      "type": "yesno",
      "text": "That's your concept. Want to sketch out who's in it and the world around them too? It's a few more questions.",
      "key": "deeper",
      "yes": "testshoot_dp_figure",
      "no": "END",
      "section": "deeper"
    },
    {
      "id": "testshoot_dp_figure",
      "type": "short",
      "text": "Who's in the frame, in a few words?",
      "placeholder": "e.g. a girl skipping summer school",
      "key": "figure",
      "next": "testshoot_dp_inner",
      "section": "deeper"
    },
    {
      "id": "testshoot_dp_inner",
      "type": "short",
      "text": "Finish this: deep down, they're feeling…",
      "placeholder": "e.g. restless but lazy",
      "key": "inner",
      "next": "testshoot_dp_vdetail",
      "section": "deeper"
    },
    {
      "id": "testshoot_dp_vdetail",
      "type": "short",
      "text": "What's one detail of how they look that sets the mood?",
      "placeholder": "e.g. a sunburn and a slip dress",
      "key": "detail",
      "next": "testshoot_dp_era",
      "section": "deeper"
    },
    {
      "id": "testshoot_dp_era",
      "type": "short",
      "text": "What era or time of day does it live in?",
      "placeholder": "e.g. a '70s summer afternoon",
      "key": "era",
      "next": "testshoot_dp_vprops",
      "section": "deeper"
    },
    {
      "id": "testshoot_dp_vprops",
      "type": "short",
      "text": "Last one: what's around them that sets the scene?",
      "placeholder": "e.g. half-drunk lemonade",
      "key": "props",
      "next": "END",
      "section": "deeper"
    }
  ]
});
