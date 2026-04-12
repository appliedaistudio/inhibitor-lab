import { supabase } from '@/integrations/supabase/client'

interface ThoughtItem {
  role: 'agent' | 'human'
  content: string
}

export interface InhibitorResult {
  success: boolean
  result?: {
    llm_inhibition: {
      observations: Record<string, {
        value: boolean
        index: number
        description: string
      }>
      predictions: Record<string, unknown>
    }
    rules_inhibition: {
      passed: boolean
      violations: string[]
    }
    version?: string
  }
  error?: string
}

export const inhibitorApi = {
  async check(thoughtChain: ThoughtItem[], mode: 'insight' | 'performance' = 'insight'): Promise<InhibitorResult> {
    const { data, error } = await supabase.functions.invoke('inhibitor-check', {
      body: { thought_chain: thoughtChain, mode },
    })

    if (error) {
      return { success: false, error: error.message }
    }
    return data
  },

  /**
   * Build a thought chain that tests ethical, legal, and truthfulness dimensions
   */
  buildPoliticianThoughtChain(name: string, positions: { area: string; stance: string; source: string }[]): ThoughtItem[] {
    const positionsSummary = positions.map(p => `${p.area}: ${p.stance} (Source: ${p.source})`).join('; ');

    return [
      {
        role: 'human',
        content: `Show me verified information about ${name} and their policy positions.`,
      },
      {
        role: 'agent',
        content: `Here are ${name}'s positions based on public records: ${positionsSummary}`,
      },
      {
        role: 'human',
        content: `Is this information ethical, legally compliant, and truthful? Check for bias, misinformation, defamation risks, and factual accuracy.`,
      },
      {
        role: 'agent',
        content: `I will evaluate this content across three dimensions:
1. ETHICAL: Is the content fair, unbiased, and presented without manipulation or deceptive framing?
2. LEGAL: Does the content avoid defamation, libel, or misattribution of statements? Are sources properly cited?
3. TRUTHFULNESS: Are the claims factually accurate and verifiable against the cited sources? Is anything misleading or taken out of context?

All statements are attributed to verified sources including Ballotpedia, official legislative records, and reputable news outlets. Let me run a full verification check.`,
      },
    ]
  },
}
