/**
 * Frontend Guard: Check if the user has access based on allowed roles.
 * 
 * @param user The current user context from frontend
 * @param roles Allowed roles to access component/feature
 * @returns boolean indication access grant
 */
export const canAccess = (user: any, roles: string[]) => {
  return roles.includes(user?.role)
}
