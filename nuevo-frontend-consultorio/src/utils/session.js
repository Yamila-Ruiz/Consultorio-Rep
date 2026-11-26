export function getStoredUser() {
  const storedUser = localStorage.getItem('usuario');
  if (!storedUser) return null;

  try {
    const user = JSON.parse(storedUser);
    if (user && typeof user === 'object' && !Array.isArray(user)) return user;
  } catch {
    localStorage.removeItem('usuario');
  }

  return null;
}
