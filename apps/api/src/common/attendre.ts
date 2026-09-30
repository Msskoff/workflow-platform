/** Pause asynchrone de `ms` millisecondes. */
export function attendre({ ms }: { ms: number }): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
