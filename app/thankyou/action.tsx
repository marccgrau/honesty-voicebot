// app/thank-you/action.tsx
'use server';

import { config } from '../../lib/config';

export async function getQuestionnaireCode() {
  return config.QUESTIONNAIRE_CODE;
}
