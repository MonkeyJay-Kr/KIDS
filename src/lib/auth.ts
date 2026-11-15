import { getIdentity } from "../../cursor/identity";
import { ensureSessionId } from "./session";

export type Viewer = {
  sub: string;
  name: string;
  email: string;
  simulated: boolean;
};

/**
 * Family albums are keyed by a browser session cookie so grandparents and
 * relatives can join with an invite code without a Cursor account.
 * When Cursor identity is present, it only seeds the default display name.
 */
export async function requireViewer(
  _request: Request,
): Promise<Viewer | Response> {
  const sessionId = await ensureSessionId();
  const identity = await getIdentity(_request);

  let name = "가족";
  let email = "";
  let simulated = false;

  if (identity.verified && identity.kind === "person") {
    name =
      identity.name?.trim() ||
      identity.email?.split("@")[0] ||
      "가족";
    email = identity.email ?? "";
    simulated = Boolean(identity.simulated);
  }

  return {
    sub: `guest:${sessionId}`,
    name,
    email,
    simulated,
  };
}

export const noStore = { "cache-control": "private, no-store" };
