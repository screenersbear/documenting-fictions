// Questions behind "Need to think it through?": Portfolio: story or vibe (the "portfolio" flow).
// One of CONCEPT_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.conceptFlows = window.EyeWords.conceptFlows || []).push({
  "id": "portfolio",
  "label": "Portfolio: story or vibe",
  "categories": [
    "portfolio_building"
  ],
  "start": "portfolio_mode",
  "nodes": [
    {
      "id": "portfolio_mode",
      "type": "yesno",
      "text": "Is this portfolio piece a story with a beginning, middle and end, or more of a vibe?",
      "hint": "Either works. Go with whatever's closest to what's in your head.",
      "key": "mode",
      "yes": "portfolio_mood",
      "no": "portfolio_who",
      "yesValue": "vibe",
      "noValue": "story",
      "noLabel": "A story",
      "yesLabel": "A vibe"
    },
    {
      "id": "portfolio_who",
      "type": "short",
      "text": "Who's the main character, in a few words?",
      "hint": "Who they're playing, not who's modeling.",
      "placeholder": "e.g. a retired magician",
      "key": "character",
      "next": "portfolio_doing"
    },
    {
      "id": "portfolio_doing",
      "type": "short",
      "text": "What do we catch them doing?",
      "hint": "One action, like a film still.",
      "placeholder": "e.g. packing up his props",
      "key": "action",
      "next": "portfolio_after"
    },
    {
      "id": "portfolio_after",
      "type": "yesno",
      "text": "Are we meeting them just before something big happens, or just after?",
      "key": "timing",
      "yes": "portfolio_moment",
      "no": "portfolio_moment",
      "yesValue": "just after",
      "noValue": "just before",
      "noLabel": "Before",
      "yesLabel": "After"
    },
    {
      "id": "portfolio_moment",
      "type": "short",
      "text": "What's the big moment, in a few words?",
      "hint": "It can be tiny: a phone call, a slammed door.",
      "placeholder": "e.g. his last show",
      "key": "moment",
      "next": "portfolio_world"
    },
    {
      "id": "portfolio_world",
      "type": "short",
      "text": "Where and when does it take place?",
      "hint": "A place, an era, or both.",
      "placeholder": "e.g. an empty '50s theater",
      "key": "world",
      "next": "portfolio_feel"
    },
    {
      "id": "portfolio_feel",
      "type": "short",
      "text": "In a few words, how should it feel?",
      "placeholder": "e.g. bittersweet",
      "key": "feeling",
      "next": "portfolio_showoff"
    },
    {
      "id": "portfolio_mood",
      "type": "short",
      "text": "In a few words, how should it feel?",
      "placeholder": "e.g. quiet and eerie",
      "key": "mood",
      "next": "portfolio_light"
    },
    {
      "id": "portfolio_light",
      "type": "short",
      "text": "What's the light and color like?",
      "hint": "Think palette and light, not gear.",
      "placeholder": "e.g. cold fluorescents",
      "key": "light",
      "next": "portfolio_place"
    },
    {
      "id": "portfolio_place",
      "type": "short",
      "text": "Where's it set?",
      "hint": "A real spot or just the kind of place.",
      "placeholder": "e.g. a laundromat at 2am",
      "key": "place",
      "next": "portfolio_refs"
    },
    {
      "id": "portfolio_refs",
      "type": "short",
      "text": "Any era, movie or reference it's borrowing from?",
      "hint": "A decade, a film, a painter, a photographer. Or just say none.",
      "placeholder": "e.g. Edward Hopper",
      "key": "refs",
      "next": "portfolio_leave"
    },
    {
      "id": "portfolio_leave",
      "type": "short",
      "text": "Finish this: it should leave you…",
      "placeholder": "e.g. a little uneasy",
      "key": "takeaway",
      "next": "portfolio_showoff"
    },
    {
      "id": "portfolio_showoff",
      "type": "short",
      "text": "Last one: what skill or style should this show off?",
      "hint": "Whatever you want future clients to see more of.",
      "placeholder": "e.g. cinematic color",
      "key": "showoff",
      "next": "END"
    },
    {
      "id": "portfolio_deeper_story",
      "type": "yesno",
      "text": "That's your concept. Want to flesh out the character and their world too? It's a few more questions.",
      "key": "deeper",
      "yes": "portfolio_dp_want",
      "no": "END",
      "section": "deeper"
    },
    {
      "id": "portfolio_dp_want",
      "type": "short",
      "text": "Finish this: more than anything, they want…",
      "placeholder": "e.g. one more standing ovation",
      "key": "want",
      "next": "portfolio_dp_secret",
      "section": "deeper"
    },
    {
      "id": "portfolio_dp_secret",
      "type": "short",
      "text": "Finish this: what they'd never say out loud is…",
      "placeholder": "e.g. he's scared of what's next",
      "key": "secret",
      "next": "portfolio_dp_detail",
      "section": "deeper"
    },
    {
      "id": "portfolio_dp_detail",
      "type": "short",
      "text": "What's one detail of how they look that tells their story?",
      "placeholder": "e.g. a perfectly tied bow tie",
      "key": "detail",
      "next": "portfolio_dp_props",
      "section": "deeper"
    },
    {
      "id": "portfolio_dp_props",
      "type": "short",
      "text": "What's around them that hints at what happened?",
      "placeholder": "e.g. a dusty, empty rabbit cage",
      "key": "props",
      "next": "portfolio_dp_after",
      "section": "deeper"
    },
    {
      "id": "portfolio_dp_after",
      "type": "short",
      "text": "Last one: what happens right after the last frame?",
      "placeholder": "e.g. he leaves the stage lights on",
      "key": "after",
      "next": "END",
      "section": "deeper"
    },
    {
      "id": "portfolio_deeper_vibe",
      "type": "yesno",
      "text": "That's your concept. Want to sketch out who's in it and the world around them too? It's a few more questions.",
      "key": "deeper",
      "yes": "portfolio_dp_figure",
      "no": "END",
      "section": "deeper"
    },
    {
      "id": "portfolio_dp_figure",
      "type": "short",
      "text": "Who's in the frame, in a few words?",
      "placeholder": "e.g. a night-shift nurse",
      "key": "figure",
      "next": "portfolio_dp_inner",
      "section": "deeper"
    },
    {
      "id": "portfolio_dp_inner",
      "type": "short",
      "text": "Finish this: deep down, they're feeling…",
      "placeholder": "e.g. too tired to go home",
      "key": "inner",
      "next": "portfolio_dp_vdetail",
      "section": "deeper"
    },
    {
      "id": "portfolio_dp_vdetail",
      "type": "short",
      "text": "What's one detail of how they look that sets the mood?",
      "placeholder": "e.g. scrubs under a winter coat",
      "key": "detail",
      "next": "portfolio_dp_era",
      "section": "deeper"
    },
    {
      "id": "portfolio_dp_era",
      "type": "short",
      "text": "What era or time of day does it live in?",
      "placeholder": "e.g. a winter night in the '90s",
      "key": "era",
      "next": "portfolio_dp_vprops",
      "section": "deeper"
    },
    {
      "id": "portfolio_dp_vprops",
      "type": "short",
      "text": "Last one: what's around them that sets the scene?",
      "placeholder": "e.g. one dryer still spinning",
      "key": "props",
      "next": "END",
      "section": "deeper"
    }
  ]
});
