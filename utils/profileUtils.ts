import { Profile } from "@types";

export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

export function formatProfileForDisplay(profile: Profile) {
  return {
    ...profile,
    age: profile.dateOfBirth ? calculateAge(profile.dateOfBirth) : undefined,
    location: profile.city || "",
    firstName: profile.fullName?.split(" ")[0] || "",
    lastName: profile.fullName?.split(" ").slice(1).join(" ") || "",
  };
}
