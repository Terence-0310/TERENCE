export type ActionScope = 'own' | 'team' | 'all' | 'none'

export interface EffectivePermission {
  key: string
  scope: ActionScope
  allowed: boolean
}
