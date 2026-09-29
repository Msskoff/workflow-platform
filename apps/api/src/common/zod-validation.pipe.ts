import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

interface ZodValidationPipeParams<Schema extends z.ZodType> {
  schema: Schema;
}

/**
 * Valide et transforme un paramètre de requête (body, query) avec un schéma Zod partagé.
 * Renvoie une 400 listant chaque champ en erreur.
 */
export class ZodValidationPipe<Schema extends z.ZodType> implements PipeTransform<
  unknown,
  z.output<Schema>
> {
  private readonly schema: Schema;

  constructor({ schema }: ZodValidationPipeParams<Schema>) {
    this.schema = schema;
  }

  transform(valeur: unknown): z.output<Schema> {
    const resultat = this.schema.safeParse(valeur);
    if (!resultat.success) {
      throw new BadRequestException({
        message: 'Données invalides',
        erreurs: resultat.error.issues.map((issue) => ({
          champ: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return resultat.data;
  }
}
