 'use client';
import { MathHtml } from './math-html';
import { SimulationFrame } from './simulation-frame';
import type { SimulationConfig } from './simulation-fields';
export function QuestionStimulus({html,simulation}:{html:string;simulation:SimulationConfig}) {
 const frame=<SimulationFrame enabled={simulation.simulationEnabled} url={simulation.simulationUrl} title={simulation.simulationTitle} description={simulation.simulationDescription} aspectRatio={simulation.simulationAspectRatio}/>;
 const marker=/<p[^>]*>\s*\[SIMULATION\]\s*<\/p>|\[SIMULATION\]/i;
 const match=marker.exec(html);
 if(!match) return <><MathHtml html={html} className="question-text reading-content" imageZoom/>{frame}</>;
 return <><MathHtml html={html.slice(0,match.index)} className="question-text reading-content" imageZoom/>{frame}<MathHtml html={html.slice(match.index+match[0].length).replace(/\[SIMULATION\]/g,'')} className="question-text reading-content" imageZoom/></>;
}
