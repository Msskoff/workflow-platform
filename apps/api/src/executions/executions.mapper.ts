import { executionWorkflowSchema, type ExecutionWorkflow } from '@workflow/shared';
import { enIsoOuNull } from '../common/dates';
import type { ExecutionWorkflow as ExecutionWorkflowLigne } from '../generated/prisma/client';

interface VersExecutionWorkflowParams {
  ligne: ExecutionWorkflowLigne;
}

/** Ligne Prisma → entité partagée (le snapshot JSON est revalidé). */
export function versExecutionWorkflow({ ligne }: VersExecutionWorkflowParams): ExecutionWorkflow {
  return executionWorkflowSchema.parse({
    ...ligne,
    demarreeLe: enIsoOuNull({ date: ligne.demarreeLe }),
    termineeLe: enIsoOuNull({ date: ligne.termineeLe }),
    creeLe: ligne.creeLe.toISOString(),
    modifieLe: ligne.modifieLe.toISOString(),
  });
}
