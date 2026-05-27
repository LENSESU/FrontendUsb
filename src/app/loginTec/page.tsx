import { redirect } from "next/navigation";

export default function LoginTecRedirectPage() {
  redirect("/login/personal");
}
