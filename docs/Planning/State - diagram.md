# State Diagram – ForgePilot
<img width="7629" height="2068" alt="State_Diagram" src="https://github.com/user-attachments/assets/61946f03-b5bc-4caf-a4ad-38e48707dc83" />


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
