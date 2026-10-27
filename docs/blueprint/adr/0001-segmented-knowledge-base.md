# 0001 Segmented, source-tagged knowledge base

Status: accepted

**Context.** Two sources exist: 142 written answers from the coordinator (xlsx, several sheets) and a 2-hour AMA recording. They overlap and sometimes differ.

**Decision.** Organise into topic segments (Log Book, Supervisor, and so on). Each fact carries a source tag: `sheet`, `ama` (with a mm:ss timestamp) or `policy`. Where sources differ, the written answer and the latest AMA statement win. Student questions are rewritten as generalised, personal-detail-free questions by hand.

**Why.** Segments make retrieval small and explainable, and let the sidebar mirror the knowledge. Source tags let the UI show certainty and let staff audit a claim.

**Consequences.** Adding knowledge is an edit to `data/source/`, then a rebuild. Raw student questions never enter the repo.
