import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  apiRoutes,
  creerExecutionWorkflowSchema,
  filtreExecutionsSchema,
  modifierExecutionWorkflowSchema,
  type CreerExecutionWorkflow,
  type ExecutionWorkflow,
  type FiltreExecutions,
  type ModifierExecutionWorkflow,
} from '@workflow/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ExecutionsService } from './executions.service';

@Controller(apiRoutes.executions)
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get()
  lister(
    @Query(new ZodValidationPipe({ schema: filtreExecutionsSchema })) filtre: FiltreExecutions,
  ): Promise<ExecutionWorkflow[]> {
    return this.executionsService.lister({ filtre });
  }

  @Get(':id')
  trouver(@Param('id') id: string): Promise<ExecutionWorkflow> {
    return this.executionsService.trouver({ id });
  }

  @Post()
  creer(
    @Body(new ZodValidationPipe({ schema: creerExecutionWorkflowSchema }))
    donnees: CreerExecutionWorkflow,
  ): Promise<ExecutionWorkflow> {
    return this.executionsService.creer({ donnees });
  }

  @Patch(':id')
  modifier(
    @Param('id') id: string,
    @Body(new ZodValidationPipe({ schema: modifierExecutionWorkflowSchema }))
    donnees: ModifierExecutionWorkflow,
  ): Promise<ExecutionWorkflow> {
    return this.executionsService.modifier({ id, donnees });
  }

  @Delete(':id')
  @HttpCode(204)
  supprimer(@Param('id') id: string): Promise<void> {
    return this.executionsService.supprimer({ id });
  }
}
