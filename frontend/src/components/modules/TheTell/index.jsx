// MODULE — The Tell (also available as a tab in Sharp Report).
import { ModuleStub } from '../ModuleStub';

export function TheTell() {
  return (
    <ModuleStub
      moduleKey="the-tell"
      eyebrow="RISK ENGINE"
      spec={[
        'Input: paste lineup or describe situation',
        'RISK SCORE: X/100',
        'RED FLAGS — specific failure modes',
        'PROJECTED DOWNSIDE — what happens if wrong',
        'FIELD EXPOSURE — % of field sharing this risk',
        'VERDICT — adjust or hold with reasoning',
        'Also lives as a tab inside Sharp Report',
      ]}
    />
  );
}
