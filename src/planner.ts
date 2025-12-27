type CandidateAction = {
    action: string;
    leverage: number;
    reversibility: number;
    learning: number;
  };
  
  export function generateLeveragePlan(
    goals?: string,
    constraints?: string,
    backlog?: string
  ) {
    // Guard: vague or missing goals
    if (!goals || goals.trim().length < 5) {
      return {
        ranked_actions: [],
        excluded_actions: [],
        irreversible_bet: "",
        rationale_summary: "Goals were too vague to generate a leverage plan"
      };
    }
  
    // Derive candidates from backlog
    const backlogItems =
      backlog?.split("\n").map(l => l.trim()).filter(Boolean) ?? [];
  
    // Detect low-time constraint
    const lowTime =
      constraints?.toLowerCase().includes("time") ||
      constraints?.toLowerCase().includes("busy");
  
    // Candidate actions (system + user input)
    const candidates: CandidateAction[] = [
      {
        action: "Clarify today’s single highest-impact decision",
        leverage: 9,
        reversibility: 8,
        learning: 7
      },
      {
        action: "Advance the most uncertain assumption",
        leverage: 8,
        reversibility: 7,
        learning: 9
      },
      ...backlogItems.slice(0, 5).map(item => ({
        action: item,
        leverage: lowTime ? 3 : 4,
        reversibility: 6,
        learning: 3
      }))
    ];
  
    // Rank by combined score
    const ranked = [...candidates].sort((a, b) => {
      const scoreA = a.leverage + a.reversibility + a.learning;
      const scoreB = b.leverage + b.reversibility + b.learning;
      return scoreB - scoreA;
    });
  
    // Hard constraints
    const maxActions = 5;
    const minExcludedRatio = 0.3;
  
    const selected = ranked.slice(0, maxActions);
    const excluded = ranked.slice(maxActions).map(a => a.action);
  
    // Ensure explicit exclusions
    if (excluded.length / ranked.length < minExcludedRatio) {
      excluded.push("Low-leverage maintenance work");
    }
  
    const constraintNote = lowTime
  ? "Time is constrained, so lower-effort actions are prioritised."
  : "Sufficient time allows for higher-leverage work.";

const rationale =
  `Actions ranked by leverage, reversibility, and learning value. ${constraintNote}`;


    return {
      ranked_actions: selected.map(a => ({
        action: a.action,
        leverage: a.leverage,
        reversibility: a.reversibility,
        learning: a.learning
      })),
      excluded_actions: excluded,
      irreversible_bet: selected[0]?.action ?? "",
      rationale_summary: rationale
    };
  }
  