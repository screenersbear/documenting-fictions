// Questions behind "Need to think it through?": Couples, families & maternity (the "people" flow).
// One of CONCEPT_FLOWS in app.js, loaded in this order before it.
window.EyeWords = window.EyeWords || {};
(window.EyeWords.conceptFlows = window.EyeWords.conceptFlows || []).push({
  "id": "people",
  "label": "Couples, families & maternity",
  "categories": [
    "engagement",
    "family",
    "maternity"
  ],
  "start": "people_q1",
  "nodes": [
    {
      "id": "people_q1",
      "type": "yesno",
      "text": "Should it be styled, or candid, catching them as they really are?",
      "hint": "Pick styled if you're picturing an idea, a theme or a little story.",
      "key": "style",
      "yes": "people_them",
      "no": "people_story",
      "categoryText": {
        "engagement": "Should it be styled, or candid, catching the two of them as they really are?",
        "family": "Should it be styled, or candid, catching this family as they really are, chaos and all?",
        "maternity": "Should it be styled, or candid, catching this season as it really is?"
      },
      "noLabel": "Styled",
      "yesLabel": "Candid"
    },
    {
      "id": "people_them",
      "type": "short",
      "text": "How would you describe them, in a few words?",
      "hint": "Whatever makes them them.",
      "placeholder": "e.g. goofy and always teasing",
      "key": "them",
      "next": "people_has_ritual",
      "categoryText": {
        "engagement": "How would you describe these two together, in a few words?",
        "family": "How would you describe this family, in a few words?",
        "maternity": "How would you describe the parents-to-be right now, in a few words?"
      }
    },
    {
      "id": "people_has_ritual",
      "type": "yesno",
      "text": "Is there something they always do together we could build it around?",
      "hint": "Think cooking dinner, walking the dog, bedtime, painting the nursery.",
      "key": "hasRitual",
      "yes": "people_ritual",
      "no": "people_has_place",
      "categoryText": {
        "engagement": "Is there something the two of them always do together we could build it around?",
        "family": "Is there a family ritual or routine we could build it around?",
        "maternity": "Is there something they're doing to get ready that we could build it around?"
      }
    },
    {
      "id": "people_ritual",
      "type": "short",
      "text": "What is it, in a few words?",
      "placeholder": "e.g. sunday pancakes",
      "key": "ritual",
      "next": "people_has_place"
    },
    {
      "id": "people_has_place",
      "type": "yesno",
      "text": "Is there a place that means something to them?",
      "hint": "Home totally counts.",
      "key": "hasPlace",
      "yes": "people_place",
      "no": "people_moment",
      "categoryText": {
        "engagement": "Is there a place that means something to the two of them?",
        "family": "Is there a place that means something to this family?",
        "maternity": "Is there a place that means something to them right now?"
      }
    },
    {
      "id": "people_place",
      "type": "short",
      "text": "Where is it, in a few words?",
      "placeholder": "e.g. the diner where they met",
      "key": "place",
      "next": "people_moment"
    },
    {
      "id": "people_moment",
      "type": "short",
      "text": "What's one little thing between them you'd hate to miss?",
      "placeholder": "e.g. the way they crack up",
      "key": "moment",
      "next": "people_feel",
      "categoryText": {
        "engagement": "What's one little thing between the two of them you'd hate to miss?",
        "family": "What's one little thing in this family you'd hate to miss?",
        "maternity": "What's one little moment or detail you'd hate to miss?"
      }
    },
    {
      "id": "people_story",
      "type": "yesno",
      "text": "Is it more of a theme or a look, or a little story with a beginning, middle and end?",
      "hint": "Either is great. Some of the best sessions are just a theme.",
      "key": "story",
      "yes": "people_plot",
      "no": "people_theme",
      "noLabel": "A theme",
      "yesLabel": "A story"
    },
    {
      "id": "people_plot",
      "type": "short",
      "text": "In a few words, what's the story about?",
      "placeholder": "e.g. a road trip gone sideways",
      "key": "plot",
      "next": "people_real"
    },
    {
      "id": "people_real",
      "type": "yesno",
      "text": "Is the story made up just for them, or pulled from their real life?",
      "key": "real",
      "yes": "people_setting",
      "no": "people_setting",
      "yesValue": "taken from real life",
      "noValue": "made up just for them",
      "categoryText": {
        "engagement": "Is the story made up just for them, or pulled from their real one, like how they met?",
        "family": "Is the story made up just for them, or pulled from real family life, like a story they always tell?",
        "maternity": "Is the story made up just for them, or pulled from their real life, like how they found out?"
      },
      "noLabel": "Made up",
      "yesLabel": "Real life"
    },
    {
      "id": "people_theme",
      "type": "short",
      "text": "What's the theme or idea, in a few words?",
      "hint": "Think of it like a title for the session.",
      "placeholder": "e.g. a '50s sunday picnic",
      "key": "theme",
      "next": "people_has_link"
    },
    {
      "id": "people_has_link",
      "type": "yesno",
      "text": "Does the theme tie back to something real about them?",
      "key": "hasLink",
      "yes": "people_link",
      "no": "people_setting",
      "categoryText": {
        "engagement": "Does the theme tie back to something real about the two of them?",
        "family": "Does the theme tie back to something real about this family?",
        "maternity": "Does the theme tie back to something real about them or this baby?"
      }
    },
    {
      "id": "people_link",
      "type": "short",
      "text": "What's the connection, in a few words?",
      "placeholder": "e.g. how her parents met",
      "key": "link",
      "next": "people_setting"
    },
    {
      "id": "people_setting",
      "type": "short",
      "text": "Where does it play out, in a few words?",
      "hint": "Bonus points if the place means something to them.",
      "placeholder": "e.g. a roadside diner",
      "key": "setting",
      "next": "people_look"
    },
    {
      "id": "people_look",
      "type": "short",
      "text": "Any era, movie or reference it's borrowing from?",
      "hint": "A decade, a film, a painter, a photographer. Or just say none.",
      "placeholder": "e.g. '70s family snapshots",
      "key": "look",
      "next": "people_feel"
    },
    {
      "id": "people_feel",
      "type": "short",
      "text": "Last one: in a few words, how should it feel?",
      "placeholder": "e.g. warm and a little messy",
      "key": "feel",
      "next": "END"
    },
    {
      "id": "people_deeper_candid",
      "type": "yesno",
      "text": "That's your concept. Want to sketch out who they are and their world too? It's a few more questions.",
      "key": "deeper",
      "yes": "people_whos_who",
      "no": "END",
      "section": "deeper"
    },
    {
      "id": "people_whos_who",
      "type": "short",
      "text": "Who's who? A few words on each of them.",
      "placeholder": "e.g. she plans, he jokes",
      "key": "who",
      "next": "people_love",
      "section": "deeper"
    },
    {
      "id": "people_love",
      "type": "short",
      "text": "Finish this: you can tell they love each other because…",
      "placeholder": "e.g. they still hold hands",
      "key": "love",
      "next": "people_wear",
      "section": "deeper"
    },
    {
      "id": "people_wear",
      "type": "short",
      "text": "What would they wear on a perfect day off?",
      "placeholder": "e.g. matching thrifted sweaters",
      "key": "wear",
      "next": "people_home",
      "section": "deeper"
    },
    {
      "id": "people_home",
      "type": "short",
      "text": "What's their world like, day to day?",
      "placeholder": "e.g. a tiny flat full of plants",
      "key": "home",
      "next": "people_season",
      "section": "deeper"
    },
    {
      "id": "people_season",
      "type": "short",
      "text": "Last one: what time of day or season feels most like them?",
      "placeholder": "e.g. slow summer evenings",
      "key": "season",
      "next": "END",
      "section": "deeper"
    },
    {
      "id": "people_deeper_story",
      "type": "yesno",
      "text": "That's your concept. Want to flesh out the characters and their world too? It's a few more questions.",
      "key": "deeper",
      "yes": "people_roles",
      "no": "END",
      "section": "deeper"
    },
    {
      "id": "people_roles",
      "type": "short",
      "text": "Who are they playing in the story?",
      "placeholder": "e.g. two runaways on the lam",
      "key": "roles",
      "next": "people_want",
      "section": "deeper"
    },
    {
      "id": "people_want",
      "type": "short",
      "text": "Finish this: more than anything, they want…",
      "placeholder": "e.g. to make it to the coast",
      "key": "want",
      "next": "people_truth",
      "section": "deeper"
    }
  ]
});
