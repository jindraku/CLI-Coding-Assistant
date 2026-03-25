# State Diagram – ForgePilot

States:

Idle
→ Accepting Task
→ Building Prompt
→ Calling LLM
→ Parsing Response
→ Selecting Tool
→ Awaiting Approval (if confirmation enabled)
→ Executing Tool
→ Observing Result
→ Generating Response
→ Completed

Error transitions possible from any state
