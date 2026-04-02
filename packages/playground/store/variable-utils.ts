export function resolveVariables(text: string, ctx: { pageNumber: number; totalPages: number }): string {
  return text
    .replace(/\{\{pageNumber\}\}/g, String(ctx.pageNumber))
    .replace(/\{\{totalPages\}\}/g, String(ctx.totalPages))
    .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
    .replace(/\{\{time\}\}/g, new Date().toLocaleTimeString());
}
