# Fuel Optimization Rules
- Active Engine: Local gemma4:e4b via Ollama
- Base Port: http://localhost:11434



💎 Suggested Quality Pattern Enhancements

  1. Synthesis and Triangulation (Moving Beyond Binary Yes/No)

  The current logic outputs a boolean (real). This discards critical information: which lenses failed, why, and the depth of failure
  across all judges.

  Improvement: After gathering vs (the array of judgments), do not just count how many are true. Structure the output to synthesize 
  a Root Cause Analysis (RCA).

  Concept:
  Instead of: v => ({ b, real: vs.filter(...).length >= 2 })
  Use an agent step to combine the structured results into a single summary object that details every finding and links it to its   
  failure vectors.

  2. Adversarial Refutation Stage (The "Hard Skeptic")

  Even if three judges agree something is real, there's always room for ambiguity or complexity. We should introduce dedicated      
  skeptics whose sole job is to find the single missing premise or edge case that makes the finding unstable.

  Concept:
  After successful initial judgment (b passes triage), run a subsequent, smaller parallel set of agents specifically tasked with    
  Refuting/Mitigating.

  - Prompt Shift: Change the agent prompt from "Judge... real?" to "Act as an expert skeptic. Given this bug description and the    
  confirmed failure mode (e.g., security via XSS), find the minimum change or edge case required for this bug to not exist."        
  - Criteria: A finding passes if it resists multiple, diverse refutation attempts from independent skeptics.

  3. Completeness Critic Check (The "What's Missing?")

  The most valuable insights often come from asking what the process overlooked. Implement a final gatekeeper agent after all prior 
  steps are complete.

  Concept:
  Introduce a stage where a single, comprehensive CompletenessCritic agent reviews the entire set of successful findings and asks:  
  1. "Based on these bugs (A, B, C), what common systemic design flaw was hit by multiple vulnerabilities?" (Looking for underlying 
  architectural weaknesses).
  2. "Are there any operational/infrastructure gaps exposed that were outside the scope of 'correctness' or 'security'?" (e.g.,     
  logging, performance under load, state management).

  💻 Conceptual Code Revisions

  Given the current script structure, I recommend transforming the logic flow into three sequential phases: Collection $\rightarrow$
  Synthesis $\rightarrow$ Elevation.

  Phase 1: Collection (Minimal Change)

  Keep your initial loop, but ensure the returned value is rich and retains the failure evidence.

  // Current Structure:
  const judged = await parallel(fresh.map(b => () =>
      parallel(['correctness','security','repro'].map(lens => () =>
          agent(`Judge "${b.desc}" via the ${lens} lens — real?`, {phase: 'Verify', schema: VERDICT})))
      .then(vs => ({ b, judgments: vs }))) // Keep full raw data
  );

  Phase 2: Synthesis and Triage (NEW CORE STEP)

  Use a specialized agent or function to process the raw judgments into structured analysis objects.

  const analyzedFindings = await parallel(judged.map(v => () =>
      agent(`Analyze findings for "${v.b.desc}":`, {
          // Pass all collected data (the 'v' object) directly to the agent as context
          context: JSON.stringify(v),
          schema: ANALYSIS_SUMMARY // Define a new schema that captures RCA, severity, etc.
      })
  ));

  // filtered for those meeting criteria AND showing high consensus
  const trulyConfirmed = analyzedFindings.filter(/* pass analysis logic */);

  Phase 3: Adversarial Validation and Escalation (Final Gate)

  For each analysisSummary in trulyConfirmed, run the skeptical check before committing it to final reports.

  const escalatedFindings = await parallel(trulyConfirmed.map(v => () => {
      // Prompt the skeptic agent with the synthesized RCA from Phase 2
      return agent(`Challenge finding: ${v.summary}. Try to find a flaw or mitigation gap.`, {schema: SKEPTIC_VERDICT});
  }));

  // The final confirmed list only includes those that survive N skepticism attempts.
  const finallyConfirmed = escalatedFindings.filter(v => v.survivesSkepticism);

  Summary Checklist for Robustness (Actionable Items)

  ┌─────────────┬────────────────┬─────────────────────────────────────────────────────┬───────────────────────────────────────┐    

  For each analysisSummary in trulyConfirmed, run the skeptical check before committing it to final reports.

  const escalatedFindings = await parallel(trulyConfirmed.map(v => () => {
      // Prompt the skeptic agent with the synthesized RCA from Phase 2

  const escalatedFindings = await parallel(trulyConfirmed.map(v => () => {
  const escalatedFindings = await parallel(trulyConfirmed.map(v => () => {
      // Prompt the skeptic agent with the synthesized RCA from Phase 2
  const escalatedFindings = await parallel(trulyConfirmed.map(v => () => {
      // Prompt the skeptic agent with the synthesized RCA from Phase 2
      // Prompt the skeptic agent with the synthesized RCA from Phase 2
      return agent(`Challenge finding: ${v.summary}. Try to find a flaw or mitigation gap.`, {schema: SKEPTIC_VERDICT});
      // Prompt the skeptic agent with the synthesized RCA from Phase 2
      return agent(`Challenge finding: ${v.summary}. Try to find a flaw or mitigation gap.`, {schema: SKEPTIC_VERDICT});
  }));
      return agent(`Challenge finding: ${v.summary}. Try to find a flaw or mitigation gap.`, {schema: SKEPTIC_VERDICT});
  }));

  // The final confirmed list only includes those that survive N skepticism attempts.
  const finallyConfirmed = escalatedFindings.filter(v => v.survivesSkepticism);

      return agent(`Challenge finding: ${v.summary}. Try to find a flaw or mitigation gap.`, {schema: SKEPTIC_VERDICT});
  }));

  // The final confirmed list only includes those that survive N skepticism attempts.
  const finallyConfirmed = escalatedFindings.filter(v => v.survivesSkepticism);
  }));

  // The final confirmed list only includes those that survive N skepticism attempts.
  const finallyConfirmed = escalatedFindings.filter(v => v.survivesSkepticism);


  // The final confirmed list only includes those that survive N skepticism attempts.
  const finallyConfirmed = escalatedFindings.filter(v => v.survivesSkepticism);

  // The final confirmed list only includes those that survive N skepticism attempts.
  const finallyConfirmed = escalatedFindings.filter(v => v.survivesSkepticism);