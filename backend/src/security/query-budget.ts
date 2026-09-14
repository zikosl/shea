import { GraphQLError, Kind, type DocumentNode, type FragmentDefinitionNode, type SelectionSetNode, type ValidationRule } from 'graphql'

export function queryBudgetError(document: DocumentNode): GraphQLError | undefined {
  const fragments = new Map<string, FragmentDefinitionNode>()
  const operations = document.definitions.filter(definition => definition.kind === Kind.OPERATION_DEFINITION)
  for (const definition of document.definitions) if (definition.kind === Kind.FRAGMENT_DEFINITION) fragments.set(definition.name.value, definition)
  let fields = 0
  let aliases = 0
  let exceeded = operations.length !== 1
  const walk = (selectionSet: SelectionSetNode, depth: number, path: Set<string>) => {
    if (exceeded) return
    if (depth > 12) { exceeded = true; return }
    for (const selection of selectionSet.selections) {
      if (exceeded) return
      if (selection.kind === Kind.FIELD) {
        fields++
        if (selection.alias) aliases++
        if (fields > 500 || aliases > 30) { exceeded = true; return }
        if (selection.selectionSet) walk(selection.selectionSet, depth + 1, path)
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        walk(selection.selectionSet, depth, path)
      } else {
        const name = selection.name.value
        if (path.has(name)) { exceeded = true; return }
        const fragment = fragments.get(name)
        if (fragment) walk(fragment.selectionSet, depth, new Set([...path, name]))
      }
    }
  }
  for (const operation of operations) walk(operation.selectionSet, 1, new Set())
  return exceeded ? new GraphQLError('QUERY_BUDGET_EXCEEDED', { extensions: { code: 'BAD_USER_INPUT' } }) : undefined
}

export const queryBudgetRule: ValidationRule = context => ({ Document(node) {
  const error = queryBudgetError(node)
  if (error) context.reportError(error)
} })
