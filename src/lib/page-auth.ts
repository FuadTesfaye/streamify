import { redirect } from "next/navigation";
import { requireViewer } from "./authorization";
import { AppError } from "./errors";
export async function pageViewer(
  options: Parameters<typeof requireViewer>[0] = {},
) {
  try {
    return await requireViewer(options);
  } catch (error) {
    if (error instanceof AppError) {
      if (error.status === 401) redirect("/login");
      if (error.code === "MFA_VERIFICATION_REQUIRED") redirect("/two-factor");
      if (
        ["MFA_SETUP_REQUIRED", "BROWSER_VERIFICATION_REQUIRED"].includes(
          error.code,
        )
      )
        redirect("/account?setup=1");
    }
    throw error;
  }
}
