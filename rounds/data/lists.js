// The newsletter lists, for Options to export as CSV files: the email list
// (names and emails, for a newsletter tool) and the mail list (names and
// postal addresses). People who were let go aren't on either.
export function listRows(people, which) {
  const on = people.filter((p) => !p.letGo && p.lists[which]);
  if (which === 'email') return [['name', 'email'], ...on.filter((p) => p.email).map((p) => [p.name, p.email])];
  return [['name', 'address'], ...on.filter((p) => p.address).map((p) => [p.name, p.address])];
}
