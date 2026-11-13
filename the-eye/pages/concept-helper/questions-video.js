// Questions behind "Need to think it through?": Video (the "video" flow).
// One of CONCEPT_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.conceptFlows = window.EyeWords.conceptFlows || []).push({
  "id": "video",
  "label": "Video",
  "categories": [
    "video"
  ],
  "start": "video_q1",
  "nodes": [
    {
      "id": "video_q1",
      "type": "yesno",
      "text": "Is this video a promo or a doc-style piece, or a story, with a character and something happening to them?",
      "hint": "Narrative music videos count as a story. Recaps and behind-the-scenes count as doc-style.",
      "key": "narrative",
      "yes": "video_who",
      "no": "video_promo",
      "noLabel": "Promo or doc",
      "yesLabel": "A story"
    },
    {
      "id": "video_who",
      "type": "short",
      "text": "Who's the story about, in a few words?",
      "placeholder": "e.g. a retired boxer",
      "key": "character",
      "next": "video_doing"
    },
    {
      "id": "video_doing",
      "type": "short",
      "text": "What are they doing when we first meet them?",
      "placeholder": "e.g. closing up his old gym",
      "key": "situation",
      "next": "video_arc"
    },
    {
      "id": "video_arc",
      "type": "yesno",
      "text": "Is it a vibe that lives in one moment, or does something happen that changes things by the end?",
      "key": "arc",
      "yes": "video_turn",
      "no": "video_image",
      "noLabel": "One moment",
      "yesLabel": "It changes"
    },
    {
      "id": "video_turn",
      "type": "short",
      "text": "What changes things? Finish this: “until…”",
      "placeholder": "e.g. a kid asks for lessons",
      "key": "turn",
      "next": "video_setting"
    },
    {
      "id": "video_image",
      "type": "short",
      "text": "What's the one image that sums up the whole vibe?",
      "placeholder": "e.g. gloves hanging on a nail",
      "key": "image",
      "next": "video_setting"
    },
    {
      "id": "video_setting",
      "type": "short",
      "text": "Where's it set?",
      "hint": "A real spot or just the kind of place.",
      "placeholder": "e.g. a small rust-belt town",
      "key": "setting",
      "next": "video_feel"
    },
    {
      "id": "video_feel",
      "type": "short",
      "text": "In a few words, how should it feel?",
      "placeholder": "e.g. bittersweet and hopeful",
      "key": "feeling",
      "next": "video_words"
    },
    {
      "id": "video_words",
      "type": "yesno",
      "text": "Last one: will it be carried by dialogue, or mostly wordless, with visuals, music and sound?",
      "hint": "Dialogue means people talk it through on camera.",
      "key": "dialogue",
      "yes": "END",
      "no": "END",
      "yesValue": "mostly wordless",
      "noValue": "dialogue-driven",
      "noLabel": "Dialogue",
      "yesLabel": "Wordless"
    },
    {
      "id": "video_promo",
      "type": "yesno",
      "text": "Is it a mini-doc, recap or behind-the-scenes piece, or a promo for something, like a brand, product, song or event?",
      "key": "promo",
      "yes": "video_product",
      "no": "video_subject",
      "noLabel": "A mini-doc",
      "yesLabel": "A promo"
    },
    {
      "id": "video_product",
      "type": "short",
      "text": "What's it promoting, in a few words?",
      "placeholder": "e.g. a local coffee roaster",
      "key": "product",
      "next": "video_audience"
    },
    {
      "id": "video_audience",
      "type": "short",
      "text": "Who needs to see it?",
      "placeholder": "e.g. young creatives",
      "key": "audience",
      "next": "video_message"
    },
    {
      "id": "video_message",
      "type": "short",
      "text": "If they only remember one thing, what is it?",
      "placeholder": "e.g. it's roasted fresh daily",
      "key": "message",
      "next": "video_tone"
    },
    {
      "id": "video_tone",
      "type": "short",
      "text": "In a few words, what's the tone?",
      "placeholder": "e.g. warm and cheeky",
      "key": "tone",
      "next": "video_platform"
    },
    {
      "id": "video_platform",
      "type": "short",
      "text": "Where will it mostly play?",
      "hint": "This decides the shape: vertical, square or wide.",
      "placeholder": "e.g. Instagram reels",
      "key": "platform",
      "next": "video_hook"
    },
    {
      "id": "video_hook",
      "type": "short",
      "text": "Last one: what's the opening shot that hooks people in the first seconds?",
      "placeholder": "e.g. a slow-mo espresso pour",
      "key": "hook",
      "next": "END"
    },
    {
      "id": "video_subject",
      "type": "short",
      "text": "What's it capturing, in a few words?",
      "placeholder": "e.g. a day in a family bakery",
      "key": "subject",
      "next": "video_style"
    },
    {
      "id": "video_style",
      "type": "yesno",
      "text": "Will you lightly direct it, or mostly follow along as things happen?",
      "hint": "Direct it if you'll stage or re-create some scenes.",
      "key": "style",
      "yes": "video_focus",
      "no": "video_focus",
      "yesValue": "shot fly-on-the-wall",
      "noValue": "lightly directed",
      "noLabel": "Direct it",
      "yesLabel": "Follow"
    },
    {
      "id": "video_focus",
      "type": "short",
      "text": "What should it keep coming back to?",
      "hint": "The thread or theme that ties it all together.",
      "placeholder": "e.g. three generations at work",
      "key": "focus",
      "next": "video_doc_moment"
    },
    {
      "id": "video_doc_moment",
      "type": "short",
      "text": "What's one moment you can't miss?",
      "placeholder": "e.g. the first loaf of the day",
      "key": "moment",
      "next": "video_doc_feel"
    },
    {
      "id": "video_doc_feel",
      "type": "short",
      "text": "Last one: in a few words, how should it feel?",
      "placeholder": "e.g. cozy and unhurried",
      "key": "feeling",
      "next": "END"
    }
  ],
  "summaries": [
    {
      "when": {
        "narrative": true,
        "arc": true
      },
      "template": "A[[ {dialogue}]] short film[[ about {character}]][[, caught {situation}]][[, until {turn}]][[, set in {setting}]].[[ It should feel {feeling}.]]",
      "pitch": [
        "[[{character}]][[ {situation}]][[ in {setting}]][[, until {turn}]].",
        "[[{character}]][[ {situation}]][[, until {turn}]].",
        "[[{character}]][[ {situation}]]."
      ]
    },
    {
      "when": {
        "narrative": true,
        "arc": false
      },
      "template": "A[[ {dialogue}]] mood piece[[ about {character}]][[, caught {situation}]][[, set in {setting}]].[[ It lingers on {image}.]][[ It should feel {feeling}.]]",
      "pitch": [
        "[[{character}]][[ {situation}]][[ in {setting}]][[: {feeling}]].",
        "[[{character}]][[ {situation}]][[ in {setting}]].",
        "[[{character}]][[ {situation}]]."
      ]
    },
    {
      "when": {
        "narrative": false,
        "promo": true
      },
      "template": "[[{tone}: ]]a promo[[ for {product}]][[, aimed at {audience}]][[ on {platform}]].[[ It opens on {hook}.]][[ The message: {message}.]]",
      "pitch": [
        "A promo[[ for {product}]][[ aimed at {audience}]][[: {message}]].",
        "A promo[[ for {product}]][[: {message}]].",
        "A promo[[ for {product}]]."
      ]
    },
    {
      "when": {
        "narrative": false,
        "promo": false
      },
      "template": "[[{feeling}: ]]a mini-doc[[ capturing {subject}]][[, {style}]].[[ It keeps coming back to {focus}.]][[ Don't miss {moment}.]]",
      "pitch": [
        "[[{subject}]][[, always coming back to {focus}]].",
        "[[{subject}]][[: {feeling}]]."
      ]
    },
    {
      "when": {},
      "template": "A video[[ about {character}]][[ for {product}]][[ capturing {subject}]].[[ It should feel {feeling}.]][[ It should feel {tone}.]]"
    }
  ]
}
);
