import { authStep } from './auth';
import { itemsStep } from './items';
import { postsStep } from './posts';
import { transactionsStep } from './transactions';
import { appointmentsStep } from './appointments';
import { membershipStep } from './membership';
import { reportStep } from './report';
import { giveawaysStep } from './giveaways';
import { uploadsStep } from './uploads';
import type { StepGroup } from '../types';

export const ALL_STEPS: StepGroup[] = [
  authStep,
  itemsStep,
  postsStep,
  transactionsStep,
  appointmentsStep,
  membershipStep,
  reportStep,
  giveawaysStep,
  uploadsStep,
];

export {
  authStep,
  itemsStep,
  postsStep,
  transactionsStep,
  appointmentsStep,
  membershipStep,
  reportStep,
  giveawaysStep,
  uploadsStep,
};
