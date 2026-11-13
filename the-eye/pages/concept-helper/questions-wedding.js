// Questions behind "Need to think it through?": Wedding (the "wedding" flow).
// One of CONCEPT_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.conceptFlows = window.EyeWords.conceptFlows || []).push({
  "id": "wedding",
  "label": "Wedding",
  "categories": [
    "wedding"
  ],
  "start": "wedding_q1",
  "nodes": [
    {
      "id": "wedding_q1",
      "type": "yesno",
      "text": "Is this a styled shoot, or a real wedding day?",
      "hint": "Real days aren't yours to direct, so we'll find a theme to follow, not a plot.",
      "key": "real",
      "yes": "wedding_approach",
      "no": "wedding_story",
      "noLabel": "Styled",
      "yesLabel": "Real day"
    },
    {
      "id": "wedding_approach",
      "type": "yesno",
      "text": "Should it lean more posed, or more candid and documentary?",
      "hint": "Either way you're following the day. This is just how much you step in.",
      "key": "approach",
      "yes": "wedding_thread",
      "no": "wedding_thread",
      "yesValue": "documentary-style",
      "noValue": "polished, editorial",
      "noLabel": "Posed",
      "yesLabel": "Documentary"
    },
    {
      "id": "wedding_thread",
      "type": "short",
      "text": "What thread do you want to follow through the day?",
      "hint": "You can't script the day, but you can pick what to notice.",
      "placeholder": "e.g. two families becoming one",
      "key": "thread",
      "next": "wedding_moment"
    },
    {
      "id": "wedding_moment",
      "type": "short",
      "text": "Which part of the day matters most to the two of them?",
      "placeholder": "e.g. the first look",
      "key": "moment",
      "next": "wedding_has_ritual"
    },
    {
      "id": "wedding_has_ritual",
      "type": "yesno",
      "text": "Are there any traditions or rituals you'll want to honor?",
      "hint": "Cultural, religious, or just a family thing.",
      "key": "hasRitual",
      "yes": "wedding_ritual",
      "no": "wedding_feel"
    },
    {
      "id": "wedding_ritual",
      "type": "short",
      "text": "Which ones, in a few words?",
      "placeholder": "e.g. the vow exchange",
      "key": "ritual",
      "next": "wedding_feel"
    },
    {
      "id": "wedding_story",
      "type": "yesno",
      "text": "Is it more of a theme or a look, or a little story with a beginning, middle and end?",
      "hint": "Either is great. Some of the best styled shoots are just a theme.",
      "key": "story",
      "yes": "wedding_plot",
      "no": "wedding_theme",
      "noLabel": "A theme",
      "yesLabel": "A story"
    },
    {
      "id": "wedding_plot",
      "type": "short",
      "text": "In a few words, what's the story about?",
      "placeholder": "e.g. a runaway bride at dawn",
      "key": "plot",
      "next": "wedding_setting"
    },
    {
      "id": "wedding_theme",
      "type": "short",
      "text": "What's the theme or idea, in a few words?",
      "hint": "Think of it like a title for the shoot.",
      "placeholder": "e.g. a '20s speakeasy elopement",
      "key": "theme",
      "next": "wedding_setting"
    },
    {
      "id": "wedding_setting",
      "type": "short",
      "text": "Where does it play out, in a few words?",
      "placeholder": "e.g. a roadside chapel",
      "key": "setting",
      "next": "wedding_look"
    },
    {
      "id": "wedding_look",
      "type": "short",
      "text": "Any era, movie or reference it's borrowing from?",
      "hint": "A decade, a film, a painter, a photographer. Or just say none.",
      "placeholder": "e.g. a '90s bridal magazine",
      "key": "look",
      "next": "wedding_feel"
    },
    {
      "id": "wedding_feel",
      "type": "short",
      "text": "Last one: in a few words, how should it feel?",
      "placeholder": "e.g. romantic and a little wild",
      "key": "feel",
      "next": "END"
    },
    {
      "id": "wedding_deeper_real",
      "type": "yesno",
      "text": "That's your concept. Want to sketch out the couple and the world of the day too? It's a few more questions.",
      "key": "deeper",
      "yes": "wedding_couple",
      "no": "END",
      "section": "deeper"
    },
    {
      "id": "wedding_couple",
      "type": "short",
      "text": "How would you describe the two of them, in a few words?",
      "placeholder": "e.g. quiet nerds who dance badly",
      "key": "couple",
      "next": "wedding_love",
      "section": "deeper"
    },
    {
      "id": "wedding_love",
      "type": "short",
      "text": "Finish this: you can tell they love each other because…",
      "placeholder": "e.g. he saves her the last bite",
      "key": "love",
      "next": "wedding_people",
      "section": "deeper"
    },
    {
      "id": "wedding_people",
      "type": "short",
      "text": "Who else matters most on the day?",
      "placeholder": "e.g. her grandma and his twin",
      "key": "people",
      "next": "wedding_venue",
      "section": "deeper"
    },
    {
      "id": "wedding_venue",
      "type": "short",
      "text": "What's the venue like, in a few words?",
      "placeholder": "e.g. a barn full of fairy lights",
      "key": "venue",
      "next": "wedding_when",
      "section": "deeper"
    },
    {
      "id": "wedding_when",
      "type": "short",
      "text": "Last one: what time of day and season is it?",
      "placeholder": "e.g. late afternoon in October",
      "key": "era",
      "next": "END",
      "section": "deeper"
    },
    {
      "id": "wedding_deeper_story",
      "type": "yesno",
      "text": "That's your concept. Want to flesh out the characters and their world too? It's a few more questions.",
      "key": "deeper",
      "yes": "wedding_roles",
      "no": "END",
      "section": "deeper"
    },
    {
      "id": "wedding_roles",
      "type": "short",
      "text": "Who are the two of them in the story?",
      "placeholder": "e.g. a bride and a getaway driver",
      "key": "roles",
      "next": "wedding_want",
      "section": "deeper"
    },
    {
      "id": "wedding_want",
      "type": "short",
      "text": "Finish this: more than anything, they want…",
      "placeholder": "e.g. to get away before sunrise",
      "key": "want",
      "next": "wedding_detail",
      "section": "deeper"
    },
    {
      "id": "wedding_detail",
      "type": "short",
      "text": "What's one detail of how they look that tells their story?",
      "placeholder": "e.g. a torn hem and muddy heels",
      "key": "detail",
      "next": "wedding_era",
      "section": "deeper"
    },
    {
      "id": "wedding_era",
      "type": "short",
      "text": "What era or time of day is it?",
      "placeholder": "e.g. 1968, just before dawn",
      "key": "era",
      "next": "wedding_props",
      "section": "deeper"
    },
    {
      "id": "wedding_props",
      "type": "short",
      "text": "Last one: what's around them that tells the story?",
      "placeholder": "e.g. tin cans tied to the bumper",
      "key": "props",
      "next": "END",
      "section": "deeper"
    },
    {
      "id": "wedding_deeper_theme",
      "type": "yesno",
      "text": "That's your concept. Want to flesh out who they're playing and their world too? It's a few more questions.",
      "key": "deeper",
      "yes": "wedding_theme_roles",
      "no": "END",
      "section": "deeper"
    },
    {
      "id": "wedding_theme_roles",
      "type": "short",
      "text": "Who are the two of them, inside the theme?",
      "placeholder": "e.g. a flapper and a bootlegger",
      "key": "roles",
      "next": "wedding_theme_detail",
      "section": "deeper"
    },
    {
      "id": "wedding_theme_detail",
      "type": "short",
      "text": "What's one detail of how they look that sells the theme?",
      "placeholder": "e.g. a beaded headband",
      "key": "detail",
      "next": "wedding_theme_era",
      "section": "deeper"
    },
    {
      "id": "wedding_theme_era",
      "type": "short",
      "text": "What era or time of day is it?",
      "placeholder": "e.g. 1926, after midnight",
      "key": "era",
      "next": "wedding_theme_props",
      "section": "deeper"
    },
    {
      "id": "wedding_theme_props",
      "type": "short",
      "text": "Last one: what's around them that sets the scene?",
      "placeholder": "e.g. a hidden door, coupe glasses",
      "key": "props",
      "next": "END",
      "section": "deeper"
    }
  ]
});
