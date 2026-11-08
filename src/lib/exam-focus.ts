/** Only the simulation iframe rendered by our own exam component is exempt. */
export const SIMULATION_FOCUS_ATTRIBUTE = 'data-exam-simulation-frame';

export function isExamSimulationIframeFocused(element: Element | null): boolean {
  return Boolean(
    element?.tagName === 'IFRAME' &&
    element.getAttribute(SIMULATION_FOCUS_ATTRIBUTE) === 'true' &&
    element.closest('.simulation-viewport') !== null,
  );
}

/** A hidden tab is always recorded, including when the iframe was focused. */
export function shouldRecordExamFocusExit(
  event: 'blur' | 'hidden' | 'fullscreen',
  tabHidden: boolean,
  simulationIframeFocused: boolean,
): boolean {
  if (event === 'hidden' || tabHidden) return true;
  return event !== 'blur' || !simulationIframeFocused;
}
