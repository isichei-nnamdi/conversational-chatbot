# Blueprint

Read this before changing structure, dependencies or the design.

## Purpose
Help Miva Open University students get through SIWES without waiting for a human. The same ten questions arrive again and again (letters, supervisors, log books, defence timing). The coordinator has already answered them in writing and in a recorded AMA. The bot makes that knowledge reachable at 11pm on a phone.

## Users
Students, mostly on phones, often on slow data, often anxious about a deadline. **User-first** means: the answer in the first line, steps as bullets, no jargon, no wall of text, and an honest "ask the coordinator" when the KB is silent.

## Shape

```
data/source (curated + faq map) --build_kb.py--> server/data/kb.json
                                                    |
 web (React) --POST /api/lookup--> close match? --> "Read this" document + "Was this helpful?"
      |   (free, no model)                   | Yes: done   | No / no match:
      +--POST /api/chat + reCAPTCHA token--> server: verify, rate limit, retrieve top segments --> Groq model
      ^                                          | no key / API down --> offline answer from the same segments
      +------ answer + source label ------------+
```

- **Knowledge base**: 14 segments in 5 groups (Start here, Before you start, While you train, Finish up, Your situation). Each has steps, source-tagged facts and generalised Q&As.
- **Retrieval**: keyword scoring over segment title, keywords, facts and Q&As. Top 3 segments go in the prompt. No vector store: the KB is small (about 75 KB) and keyword retrieval is explainable.
- **System prompt**: patient, short, bulleted steps, answers only from the supplied segments, never invents dates or fees, points to the coordinator when unsure, tells students not to share personal identifiers.
- **Frontend**: chat is the first screen. Sidebar of topics (drawer on phones), quick-start tiles, a certainty label on every answer, "Flag a correction".
- **Design**: Veriscope's "every record wears its certainty", M8ion's grouped sidebar and quick-start tiles, and the UI/UX floor. Colours Cinnabar `#E43B31` (alerts, flag, brand accent), Tarawera `#09314F` (ink, primary buttons, dark base), Picton Blue `#38BDF8` (links, focus, assistant accent).

## Decisions
See [adr/](adr/). 
