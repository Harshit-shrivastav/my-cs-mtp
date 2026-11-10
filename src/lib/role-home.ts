// Landing page per role after a successful sign-in.
export function homeForRole(role: string): string {
  if (role === 'ADMIN') return '/admin'
  if (role === 'EXAMINER') return '/examiner'
  return '/dashboard'
}
