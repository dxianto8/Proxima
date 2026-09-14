/**
 * Node's ESM resolver wants a file extension; the app's source uses
 * bundler-style extensionless imports ("./date"). This hook fills the gap so
 * `node --test` can run the real modules with no build step in between.
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    if (!relative || /\.[a-z]+$/i.test(specifier)) throw error;
    for (const candidate of [`${specifier}.ts`, `${specifier}.tsx`, `${specifier}/index.ts`]) {
      try {
        return await nextResolve(candidate, context);
      } catch {
        /* try the next candidate */
      }
    }
    throw error;
  }
}
