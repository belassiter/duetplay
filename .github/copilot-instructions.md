# Project Rules for DuetPlay

You are working on the DuetPlay project. You must adhere to the following strictly, without requiring input from the user:

## Behavior
*   Take a test-driven development (TDD) approach: write tests before implementing features or fixing bugs.

## The "Definition of Done" Protocol
Before telling the user a task is complete, you MUST perform these 3 steps in order, and everything must pass:

1.  **LINT**: Run `npm run lint` (and `npm run lint -- --fix` if needed).
2.  **TEST**: Run `npm test`. All tests must pass.
3.  **BUILD**: Run `npm run build` (This compiles the code but does *not* create the Windows executable).

## Documentation
*   You must maintain `copilot_journal.md`. 
*   After the verification steps pass, add an entry to the journal quoting the user's exact prompt text (do not paraphrase) and summarizing the changes, using standard file editing commands. Include the date and time for each entry, and add new entries to the top of the file.
