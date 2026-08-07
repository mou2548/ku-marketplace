import { AuthPanel } from "../auth-panel";

export const metadata = { title: "Register - KU Marketplace" };

/**
 * The same panel as `/login` with the other tab active. Registering is three
 * fields, so it does not need a page of its own — but it keeps its own URL so
 * the tab is a real link and the back button behaves.
 */
export default function RegisterPage() {
  return <AuthPanel mode="register" />;
}
