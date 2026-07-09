import * as SecureStore from 'expo-secure-store'
import { studentAPI } from './api'

/**
 * HERO gate — until today's requirement is done, freestyle areas (arcade,
 * practice, challenge) are LOCKED. The requirement is:
 *   • a due monthly exam (examDue) — takes priority, else
 *   • today's HERO daily task.
 *
 * Gated SCREENS call `checkHeroGate()` on load and, if locked, bounce back to
 * the dashboard. This closes the mobile loophole where the bottom tab bar let
 * students open the arcade/practice directly without finishing the task.
 */
export type HeroGate = { locked: boolean; examDue: boolean; reason: string }

export async function checkHeroGate(): Promise<HeroGate> {
  try {
    const id = await SecureStore.getItemAsync('user_id')
    if (!id) return { locked: false, examDue: false, reason: '' }
    const res = await studentAPI.dailyTask(id)
    const data = res?.data || {}
    const examDue = !!data.examDue
    // Locked whenever today's requirement isn't done (gated=true from the API,
    // or an exam is owed).
    const locked = examDue || data.gated === true || (!!data.task && data.task.done !== true)
    return {
      locked,
      examDue,
      reason: examDue
        ? 'Finish this month’s HERO exam first to unlock this.'
        : 'Finish today’s HERO task first to unlock this.',
    }
  } catch {
    // If the check fails (offline / old backend), don't hard-lock the student.
    return { locked: false, examDue: false, reason: '' }
  }
}
