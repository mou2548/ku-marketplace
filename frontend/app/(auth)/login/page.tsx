import { AuthPanel } from "../auth-panel";

export const metadata = { title: "Sign in - KU Marketplace" };

/**
 * The only auth entry point. Registering is a tab on this panel rather than a
 * route of its own — it is three fields, and moving between it and the sign-in
 * form should not cost a navigation. `/register` redirects here.
 */
export default function LoginPage() {
  return <AuthPanel />;
}
