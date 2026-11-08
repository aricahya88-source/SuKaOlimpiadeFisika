import test from 'node:test';
import assert from 'node:assert/strict';
import { isExamSimulationIframeFocused, shouldRecordExamFocusExit } from '../src/lib/exam-focus';

const element = (tag: string, marked: boolean, inViewport: boolean) => ({
  tagName: tag,
  getAttribute: (name: string) => name === 'data-exam-simulation-frame' && marked ? 'true' : null,
  closest: () => inViewport ? {} : null,
}) as unknown as Element;

test('Only the embedded exam simulation iframe receives the focus exception', () => {
  assert.equal(isExamSimulationIframeFocused(element('IFRAME', true, true)), true);
  assert.equal(isExamSimulationIframeFocused(element('IFRAME', false, true)), false);
  assert.equal(isExamSimulationIframeFocused(element('IFRAME', true, false)), false);
  assert.equal(isExamSimulationIframeFocused(element('DIV', true, true)), false);
  assert.equal(isExamSimulationIframeFocused(null), false);
});

test('Iframe click is ignored, but real tab hiding always counts', () => {
  assert.equal(shouldRecordExamFocusExit('blur', false, true), false);
  assert.equal(shouldRecordExamFocusExit('blur', false, false), true);
  assert.equal(shouldRecordExamFocusExit('hidden', true, true), true);
  assert.equal(shouldRecordExamFocusExit('blur', true, true), true);
  assert.equal(shouldRecordExamFocusExit('fullscreen', false, false), true);
});
