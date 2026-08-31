# Kipu – Agentic AI Architecture Rules

These rules are binding for Codex and all future implementation work in this repository.

## Core principle

Kipu is an AI-first personal memory agent. The model should interpret intent and choose tools. Application code should provide capabilities, validation, persistence, security, and UI — not replace intelligence with growing category-specific decision trees.

## Do not build category rule trees

Do NOT add logic such as:

- if category === "Buch" then ...
- if restaurant then ...
- if product then ...
- switch(entityType) with special behavior per content class
- regex/keyword lists that decide what the AI should understand
- separate hard-coded enrichment pipelines for books, restaurants, products, films, places, etc.

A category-specific branch requires explicit product approval and must be justified by a real external API or safety/technical constraint, not by a desire to improve AI output.

## Preferred architecture

1. Give the model a clear goal and context.
2. Expose generic tools with strong schemas.
3. Let the model decide which tools are useful and in which order.
4. Return tool results to the model.
5. Let the model synthesize the final structured memory.
6. Validate the structured result server-side.
7. Persist the original input separately from model-generated enrichment.

Examples of generic tools:

- search_web(query)
- find_representative_images(query, context)
- inspect_web_page(url)
- reverse_geocode(latitude, longitude)
- save_idea(payload)
- search_my_ideas(query)

The tool names may change. Their purpose must stay generic.

## Image principle

There is one generic concept: `representative_image`.

The AI chooses the image that best represents the remembered subject. Depending on the subject this may naturally be a book cover, restaurant view, product photo, film poster, landscape, event image, user photo, or no image at all.

Do not create source-specific image rules such as ISBN cover logic or restaurant-only image logic unless explicitly approved.

The selected image is stored with the idea and reused consistently in detail views, lists, search results, and map/browse surfaces.

## Location principle

Keep these concepts separate:

- capture location: where the user created the memory
- subject location: location belonging to the remembered subject

Do not infer that capture location is subject location. The model may decide that the capture location is relevant when the input implies this, e.g. "diese Grillstelle hier".

## Research principle

Research should improve recall, not create a report.

The model decides whether research is useful. Store:

- concise memory-oriented summary
- a small number of useful facts
- sources separately

Never leak citation markup, raw URLs, tool metadata, or search-result syntax into user-facing summaries/facts.

## Original input is immutable evidence

Always preserve the user's original text/transcript/photo/file reference separately from AI-generated title, summary, tags, facts, location interpretation, images, and research.

## When uncertain

Prefer model/tool reasoning over adding another deterministic rule. If the current tools are insufficient, add or improve a generic tool rather than encoding a new content category into application logic.
