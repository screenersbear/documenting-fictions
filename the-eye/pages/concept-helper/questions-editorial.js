// Questions behind "Need to think it through?": Editorial: story or vibe (the "editorial" flow).
// One of CONCEPT_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.conceptFlows = window.EyeWords.conceptFlows || []).push({
  "id": "editorial",
  "label": "Editorial: story or vibe",
  "categories": [
    "editorial"
  ],
  "start": "editorial_mode",
  "nodes": [
    {
      "id": "editorial_mode",
      "type": "yesno",
      "text": "Is this spread a story with a beginning, middle and end, or more of a vibe?",
      "hint": "Either is great. Some of the best spreads are all vibe.",
      "key": "mode",
      "yes": "editorial_mood",
      "no": "editorial_who",
      "yesValue": "vibe",
      "noValue": "story",
      "noLabel": "A story",
      "yesLabel": "A vibe"
    },
    {
      "id": "editorial_who",
      "type": "short",
      "text": "Who's the main character, in a few words?",
      "hint": "Who they're playing, not who's modeling.",
      "placeholder": "e.g. a runaway bride",
      "key": "character",
      "next": "editorial_doing"
    },
    {
      "id": "editorial_doing",
      "type": "short",
      "text": "What do we catch them doing?",
      "hint": "One action, like a film still.",
      "placeholder": "e.g. smoking in her gown",
      "key": "action",
      "next": "editorial_after"
    },
    {
      "id": "editorial_after",
      "type": "yesno",
      "text": "Are we meeting them just before something big happens, or just after?",
      "key": "timing",
      "yes": "editorial_moment",
      "no": "editorial_moment",
      "yesValue": "just after",
      "noValue": "just before",
      "noLabel": "Before",
      "yesLabel": "After"
    },
    {
      "id": "editorial_moment",
      "type": "short",
      "text": "What's the big moment, in a few words?",
      "hint": "It can be tiny: a phone call, a slammed door.",
      "placeholder": "e.g. leaving the church",
      "key": "moment",
      "next": "editorial_world"
    },
    {
      "id": "editorial_world",
      "type": "short",
      "text": "Where and when does it take place?",
      "hint": "A place, an era, or both.",
      "placeholder": "e.g. a '70s desert motel",
      "key": "world",
      "next": "editorial_feel"
    },
    {
      "id": "editorial_feel",
      "type": "short",
      "text": "In a few words, how should it feel?",
      "placeholder": "e.g. lonely but hopeful",
      "key": "feeling",
      "next": "editorial_styling"
    },
    {
      "id": "editorial_mood",
      "type": "short",
      "text": "In a few words, how should it feel?",
      "placeholder": "e.g. dreamy but lonely",
      "key": "mood",
      "next": "editorial_light"
    },
    {
      "id": "editorial_light",
      "type": "short",
      "text": "What's the light and color like?",
      "hint": "Think palette and light, not gear.",
      "placeholder": "e.g. hazy, faded pastels",
      "key": "light",
      "next": "editorial_place"
    },
    {
      "id": "editorial_place",
      "type": "short",
      "text": "Where's it set?",
      "hint": "A real spot or just the kind of place.",
      "placeholder": "e.g. an empty ballroom",
      "key": "place",
      "next": "editorial_refs"
    },
    {
      "id": "editorial_refs",
      "type": "short",
      "text": "Any era, movie or reference it's borrowing from?",
      "hint": "A decade, a film, a painter, a photographer. Or just say none.",
      "placeholder": "e.g. '90s fashion mags",
      "key": "refs",
      "next": "editorial_leave"
    },
    {
      "id": "editorial_leave",
      "type": "short",
      "text": "Finish this: it should leave you…",
      "placeholder": "e.g. a little homesick",
      "key": "takeaway",
      "next": "editorial_styling"
    },
    {
      "id": "editorial_styling",
      "type": "yesno",
      "text": "Last one: should the styling be stripped-back and real, or fashion-forward?",
      "key": "styling",
      "yes": "END",
      "no": "END",
      "yesValue": "fashion-forward",
      "noValue": "stripped-back",
      "noLabel": "Stripped-back",
      "yesLabel": "Fashion-forward"
    },
    {
      "id": "editorial_deeper_story",
      "type": "yesno",
      "text": "That's your concept. Want to flesh out the character and their world too? It's a few more questions.",
      "key": "deeper",
      "yes": "editorial_dp_want",
      "no": "END",
      "section": "deeper"
    },
    {
      "id": "editorial_dp_want",
      "type": "short",
      "text": "Finish this: more than anything, they want…",
      "placeholder": "e.g. to be anywhere but here",
      "key": "want",
      "next": "editorial_dp_secret",
      "section": "deeper"
    },
    {
      "id": "editorial_dp_secret",
      "type": "short",
      "text": "Finish this: what they'd never say out loud is…",
      "placeholder": "e.g. she still loves him",
      "key": "secret",
      "next": "editorial_dp_detail",
      "section": "deeper"
    },
    {
      "id": "editorial_dp_detail",
      "type": "short",
      "text": "What's one detail of how they look that tells their story?",
      "placeholder": "e.g. a veil she won't take off",
      "key": "detail",
      "next": "editorial_dp_props",
      "section": "deeper"
    },
    {
      "id": "editorial_dp_props",
      "type": "short",
      "text": "What's around them that hints at what happened?",
      "placeholder": "e.g. a melting cake on the hood",
      "key": "props",
      "next": "editorial_dp_after",
      "section": "deeper"
    },
    {
      "id": "editorial_dp_after",
      "type": "short",
      "text": "Last one: what happens right after the last frame?",
      "placeholder": "e.g. she drives off alone",
      "key": "after",
      "next": "END",
      "section": "deeper"
    },
    {
      "id": "editorial_deeper_vibe",
      "type": "yesno",
      "text": "That's your concept. Want to sketch out who's in it and the world around them too? It's a few more questions.",
      "key": "deeper",
      "yes": "editorial_dp_figure",
      "no": "END",
      "section": "deeper"
    },
    {
      "id": "editorial_dp_figure",
      "type": "short",
      "text": "Who's in the frame, in a few words?",
      "placeholder": "e.g. a debutante who left early",
      "key": "figure",
      "next": "editorial_dp_inner",
      "section": "deeper"
    },
    {
      "id": "editorial_dp_inner",
      "type": "short",
      "text": "Finish this: deep down, they're feeling…",
      "placeholder": "e.g. a little forgotten",
      "key": "inner",
      "next": "editorial_dp_vdetail",
      "section": "deeper"
    },
    {
      "id": "editorial_dp_vdetail",
      "type": "short",
      "text": "What's one detail of how they look that sets the mood?",
      "placeholder": "e.g. smudged lipstick, one glove",
      "key": "detail",
      "next": "editorial_dp_era",
      "section": "deeper"
    },
    {
      "id": "editorial_dp_era",
      "type": "short",
      "text": "What era or time of day does it live in?",
      "placeholder": "e.g. the '80s, just past midnight",
      "key": "era",
      "next": "editorial_dp_vprops",
      "section": "deeper"
    },
    {
      "id": "editorial_dp_vprops",
      "type": "short",
      "text": "Last one: what's around them that sets the scene?",
      "placeholder": "e.g. deflating balloons",
      "key": "props",
      "next": "END",
      "section": "deeper"
    }
  ]
});
