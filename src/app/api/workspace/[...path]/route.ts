import { workspaceAPI } from "@/server/services/workspace-api";
export const runtime = "nodejs";
type Context = { params: Promise<{ path: string[] }> };
async function handler(request: Request, context: Context) {
  return workspaceAPI(request, (await context.params).path);
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
