// Questions behind "Need to think it through?": Brand, commercial & content (the "brand" flow).
// One of CONCEPT_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.conceptFlows = window.EyeWords.conceptFlows || []).push({
  "id": "brand",
  "label": "Brand, commercial & content",
  "categories": [
    "branding",
    "commercial",
    "content_shoot"
  ],
  "start": "brand_q1",
  "nodes": [
    {
      "id": "brand_q1",
      "type": "yesno",
      "text": "Should it be clean shots with one clear star, or feel like real life?",
      "hint": "Clean means front-and-center shots, nothing going on around them.",
      "key": "lifestyle",
      "yes": "brand_scene",
      "no": "brand_hero",
      "categoryText": {
        "branding": "Should it be clean portraits or product shots, or the brand in real-life moments?",
        "commercial": "Should the product be shot on its own, or in use in real life?",
        "content_shoot": "Should the content be clean, posed setups, or real life in motion?"
      },
      "noLabel": "Clean",
      "yesLabel": "Real life"
    },
    {
      "id": "brand_scene",
      "type": "short",
      "text": "What everyday moment are we showing?",
      "placeholder": "e.g. lazy sunday mornings",
      "key": "scene",
      "next": "brand_subject",
      "categoryText": {
        "branding": "What real-life moment shows what the brand is about?",
        "commercial": "What moment is the product being used in?",
        "content_shoot": "What everyday moment should the content live in?"
      }
    },
    {
      "id": "brand_hero",
      "type": "short",
      "text": "What should be front and center?",
      "placeholder": "e.g. the new cold brew",
      "key": "hero",
      "next": "brand_subject",
      "categoryText": {
        "branding": "Who or what should be front and center? The founder, the product?",
        "commercial": "Which product, or which detail of it, should be the star?",
        "content_shoot": "What should be front and center in every frame?"
      }
    },
    {
      "id": "brand_subject",
      "type": "short",
      "text": "Who's the client, in a few words?",
      "placeholder": "e.g. a coffee roaster",
      "key": "subject",
      "next": "brand_takeaway",
      "categoryText": {
        "branding": "Whose brand is this, in a few words?",
        "commercial": "Who's the client or product, in a few words?",
        "content_shoot": "Whose feed is this for, in a few words?"
      }
    },
    {
      "id": "brand_takeaway",
      "type": "short",
      "text": "What's the one thing people should take away?",
      "hint": "One idea beats five.",
      "placeholder": "e.g. it's made with care",
      "key": "takeaway",
      "next": "brand_audience",
      "categoryText": {
        "branding": "What's the one thing people should know about the brand after seeing these?",
        "commercial": "What's the one thing a viewer should take away about the product?",
        "content_shoot": "What's the one thing a scroller should get in a second?"
      }
    },
    {
      "id": "brand_audience",
      "type": "short",
      "text": "Who should see it, and where?",
      "hint": "Who they are, plus where they'll see it.",
      "placeholder": "e.g. new moms on Instagram",
      "key": "audience",
      "next": "brand_words",
      "categoryText": {
        "branding": "Who's the dream customer, and where will they see these?",
        "commercial": "Who's the buyer, and where will the ads reach them?",
        "content_shoot": "Who should stop scrolling, and on which app?"
      }
    },
    {
      "id": "brand_words",
      "type": "short",
      "text": "Three words for its personality?",
      "hint": "Adjectives work best.",
      "placeholder": "e.g. warm, bold, honest",
      "key": "words",
      "next": "brand_polish",
      "categoryText": {
        "branding": "Three words for the brand's personality?",
        "commercial": "Three words for how the product should come across?",
        "content_shoot": "Three words for the account's personality?"
      }
    },
    {
      "id": "brand_polish",
      "type": "yesno",
      "text": "Last one: should it look raw and real, or polished and high-end?",
      "key": "polish",
      "yes": "END",
      "no": "END",
      "yesValue": "polished",
      "noValue": "raw, natural",
      "categoryText": {
        "commercial": "Last one: should it look raw and real, or glossy and high-end?",
        "content_shoot": "Last one: should it look raw and shot-on-a-phone, or polished?"
      },
      "noLabel": "Raw",
      "yesLabel": "Polished"
    },
    {
      "id": "brand_deeper",
      "type": "yesno",
      "text": "That's your concept. Want to sketch out who's in it and the brand's world too? It's a few more questions.",
      "key": "deeper",
      "yes": "brand_cast",
      "no": "END",
      "section": "deeper"
    },
    {
      "id": "brand_cast",
      "type": "short",
      "text": "Who's in the shots, in a few words?",
      "placeholder": "e.g. the founder and her regulars",
      "key": "cast",
      "next": "brand_persona",
      "section": "deeper"
    },
    {
      "id": "brand_persona",
      "type": "short",
      "text": "Finish this: if the brand were a person, they'd be…",
      "placeholder": "e.g. the friend who brings snacks",
      "key": "persona",
      "next": "brand_home",
      "section": "deeper"
    },
    {
      "id": "brand_home",
      "type": "short",
      "text": "Where does the brand live, in a few words?",
      "placeholder": "e.g. a sunny corner café",
      "key": "home",
      "next": "brand_props",
      "section": "deeper"
    },
    {
      "id": "brand_props",
      "type": "short",
      "text": "Last one: what should always be in the frame?",
      "placeholder": "e.g. steam, linen and real hands",
      "key": "props",
      "next": "END",
      "section": "deeper"
    }
  ],
  "summaries": [
    {
      "when": {
        "lifestyle": true
      },
      "template": "A[[ {polish}]] lifestyle shoot[[ for {subject}]][[, built around {scene}]][[, aimed at {audience}]].[[ It should feel {words}.]][[ The message: {takeaway}.]]",
      "pitch": [
        "[[{scene}]][[ for {subject}]][[. The message: {takeaway}]].",
        "[[{scene}]][[ for {subject}]].",
        "[[{scene}]][[. The message: {takeaway}]]."
      ],
      "character": [
        "[[In the shots: {cast}.]][[ If the brand were a person, they'd be {persona}.]][[ Its personality: {words}.]]"
      ],
      "world": [
        "[[The brand's world: {home}.]][[ Built around {scene}.]][[ Always in the frame: {props}.]][[ Made for {audience}.]]"
      ]
    },
    {
      "when": {
        "lifestyle": false
      },
      "template": "A[[ {polish}]] shoot[[ for {subject}]][[, with {hero} front and center]][[, aimed at {audience}]].[[ It should feel {words}.]][[ The message: {takeaway}.]]",
      "pitch": [
        "[[{subject}]][[, with {hero} front and center]][[. The message: {takeaway}]].",
        "[[{subject}]][[, with {hero} front and center]].",
        "[[{hero} front and center]][[. The message: {takeaway}]]."
      ],
      "character": [
        "[[In the shots: {cast}.]][[ If the brand were a person, they'd be {persona}.]][[ Its personality: {words}.]]"
      ],
      "world": [
        "[[The brand's world: {home}.]][[ Built around {scene}.]][[ Always in the frame: {props}.]][[ Made for {audience}.]]"
      ]
    },
    {
      "when": {},
      "template": "A[[ {polish}]] shoot[[ for {subject}]][[, aimed at {audience}]].[[ It should feel {words}.]][[ The message: {takeaway}.]]"
    }
  ],
  "deeper": [
    {
      "when": {},
      "start": "brand_deeper"
    }
  ]
}
);
