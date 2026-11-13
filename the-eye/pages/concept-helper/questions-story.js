// Questions behind "Need to think it through?": Story or vibe (the "story" flow).
// One of CONCEPT_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.conceptFlows = window.EyeWords.conceptFlows || []).push({
  "id": "story",
  "label": "Story or vibe",
  "categories": [
    "other",
    ""
  ],
  "start": "story_mode",
  "nodes": [
    {
      "id": "story_mode",
      "type": "yesno",
      "text": "Is the idea a story with a beginning, middle and end, or more of a vibe?",
      "hint": "No wrong answer. Some ideas are a whole plot, some are just a feeling.",
      "key": "mode",
      "yes": "story_mood",
      "no": "story_who",
      "yesValue": "vibe",
      "noValue": "story",
      "noLabel": "A story",
      "yesLabel": "A vibe"
    },
    {
      "id": "story_who",
      "type": "short",
      "text": "Who's the main character, in a few words?",
      "hint": "Who they're playing, not who's modeling.",
      "placeholder": "e.g. an astronaut's wife",
      "key": "character",
      "next": "story_doing"
    },
    {
      "id": "story_doing",
      "type": "short",
      "text": "What do we catch them doing?",
      "hint": "One action, like a film still.",
      "placeholder": "e.g. setting the table",
      "key": "action",
      "next": "story_after"
    },
    {
      "id": "story_after",
      "type": "yesno",
      "text": "Are we meeting them just before something big happens, or just after?",
      "key": "timing",
      "yes": "story_moment",
      "no": "story_moment",
      "yesValue": "just after",
      "noValue": "just before",
      "noLabel": "Before",
      "yesLabel": "After"
    },
    {
      "id": "story_moment",
      "type": "short",
      "text": "What's the big moment, in a few words?",
      "hint": "It can be tiny: a phone call, a slammed door.",
      "placeholder": "e.g. the launch",
      "key": "moment",
      "next": "story_world"
    },
    {
      "id": "story_world",
      "type": "short",
      "text": "Where and when does it take place?",
      "hint": "A place, an era, or both.",
      "placeholder": "e.g. a '60s suburban kitchen",
      "key": "world",
      "next": "story_feel"
    },
    {
      "id": "story_feel",
      "type": "short",
      "text": "In a few words, how should it feel?",
      "placeholder": "e.g. tender and strange",
      "key": "feeling",
      "next": "story_frames"
    },
    {
      "id": "story_frames",
      "type": "yesno",
      "text": "Last one: is the story told across a few frames, or just one?",
      "key": "storyFormat",
      "yes": "END",
      "no": "END",
      "yesValue": "told in a single frame",
      "noValue": "told across a few frames",
      "noLabel": "A few",
      "yesLabel": "Just one"
    },
    {
      "id": "story_mood",
      "type": "short",
      "text": "In a few words, how should it feel?",
      "placeholder": "e.g. hazy and nostalgic",
      "key": "mood",
      "next": "story_light"
    },
    {
      "id": "story_light",
      "type": "short",
      "text": "What's the light and color like?",
      "hint": "Think palette and light, not gear.",
      "placeholder": "e.g. warm tungsten glow",
      "key": "light",
      "next": "story_place"
    },
    {
      "id": "story_place",
      "type": "short",
      "text": "Where's it set?",
      "hint": "A real spot or just the kind of place.",
      "placeholder": "e.g. a roller rink",
      "key": "place",
      "next": "story_refs"
    },
    {
      "id": "story_refs",
      "type": "short",
      "text": "Any era, movie or reference it's borrowing from?",
      "hint": "A decade, a film, a painter, a photographer. Or just say none.",
      "placeholder": "e.g. '80s home videos",
      "key": "refs",
      "next": "story_leave"
    },
    {
      "id": "story_leave",
      "type": "short",
      "text": "Finish this: it should leave you…",
      "placeholder": "e.g. missing someone",
      "key": "takeaway",
      "next": "story_vibe_frames"
    },
    {
      "id": "story_vibe_frames",
      "type": "yesno",
      "text": "Last one: is the vibe built as a series, or captured in one image?",
      "key": "vibeFormat",
      "yes": "END",
      "no": "END",
      "yesValue": "captured in a single image",
      "noValue": "built as a series",
      "noLabel": "A series",
      "yesLabel": "One image"
    },
    {
      "id": "story_deeper_story",
      "type": "yesno",
      "text": "That's your concept. Want to flesh out the character and their world too? It's a few more questions.",
      "key": "deeper",
      "yes": "story_dp_want",
      "no": "END",
      "section": "deeper"
    },
    {
      "id": "story_dp_want",
      "type": "short",
      "text": "Finish this: more than anything, they want…",
      "placeholder": "e.g. to hear his voice",
      "key": "want",
      "next": "story_dp_secret",
      "section": "deeper"
    },
    {
      "id": "story_dp_secret",
      "type": "short",
      "text": "Finish this: what they'd never say out loud is…",
      "placeholder": "e.g. she's terrified",
      "key": "secret",
      "next": "story_dp_detail",
      "section": "deeper"
    },
    {
      "id": "story_dp_detail",
      "type": "short",
      "text": "What's one detail of how they look that tells their story?",
      "placeholder": "e.g. pearls over her apron",
      "key": "detail",
      "next": "story_dp_props",
      "section": "deeper"
    },
    {
      "id": "story_dp_props",
      "type": "short",
      "text": "What's around them that hints at what happened?",
      "placeholder": "e.g. the TV left on, too loud",
      "key": "props",
      "next": "story_dp_after",
      "section": "deeper"
    },
    {
      "id": "story_dp_after",
      "type": "short",
      "text": "Last one: what happens right after the last frame?",
      "placeholder": "e.g. the phone finally rings",
      "key": "after",
      "next": "END",
      "section": "deeper"
    },
    {
      "id": "story_deeper_vibe",
      "type": "yesno",
      "text": "That's your concept. Want to sketch out who's in it and the world around them too? It's a few more questions.",
      "key": "deeper",
      "yes": "story_dp_figure",
      "no": "END",
      "section": "deeper"
    },
    {
      "id": "story_dp_figure",
      "type": "short",
      "text": "Who's in the frame, in a few words?",
      "placeholder": "e.g. a teenager on her first date",
      "key": "figure",
      "next": "story_dp_inner",
      "section": "deeper"
    },
    {
      "id": "story_dp_inner",
      "type": "short",
      "text": "Finish this: deep down, they're feeling…",
      "placeholder": "e.g. giddy and nervous",
      "key": "inner",
      "next": "story_dp_vdetail",
      "section": "deeper"
    },
    {
      "id": "story_dp_vdetail",
      "type": "short",
      "text": "What's one detail of how they look that sets the mood?",
      "placeholder": "e.g. glitter on her cheeks",
      "key": "detail",
      "next": "story_dp_era",
      "section": "deeper"
    },
    {
      "id": "story_dp_era",
      "type": "short",
      "text": "What era or time of day does it live in?",
      "placeholder": "e.g. a Friday night in 1985",
      "key": "era",
      "next": "story_dp_vprops",
      "section": "deeper"
    },
    {
      "id": "story_dp_vprops",
      "type": "short",
      "text": "Last one: what's around them that sets the scene?",
      "placeholder": "e.g. a disco ball and sticky floors",
      "key": "props",
      "next": "END",
      "section": "deeper"
    }
  ]
});
