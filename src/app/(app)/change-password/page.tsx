import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/features/change-password-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireViewer } from "@/lib/viewer";
import { changePasswordAction } from "./actions";

export const metadata: Metadata = { title: "Change password" };

/** Choose your own password: forced after signing in with a temporary one. */
export default async function ChangePasswordPage() {
  const viewer = await requireViewer({ allowPasswordChange: true });
  return (
    <>
      <PageHeader
        eyebrow="Your account"
        title={viewer.mustChangePassword ? "Choose a new password" : "Change your password"}
        meta={
          viewer.mustChangePassword
            ? "The Admin gave you a temporary password. Choose your own before you continue."
            : "Choose a new password for your account."
        }
      />
      <ChangePasswordForm action={changePasswordAction} />
    </>
  );
}
