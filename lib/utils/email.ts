/**
 * Masks an email address for security purposes
 * Example: user@gmail.com -> uXXXr@gmail.com
 */
export function maskEmail(email: string): string {
  const [username, domain] = email.split('@')
  
  if (!username || !domain) {
    return email
  }
  
  if (username.length <= 2) {
    return `${username[0]}***@${domain}`
  }
  
  const firstChar = username[0]
  const lastChar = username[username.length - 1]
  const maskedLength = Math.min(username.length - 2, 3)
  const masked = 'X'.repeat(maskedLength)
  
  return `${firstChar}${masked}${lastChar}@${domain}`
}
