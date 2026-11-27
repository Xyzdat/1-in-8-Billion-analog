import { sessionsApi } from '../api';
import type { BudgetSection } from '../api/budgetTypes';
import type { Session } from '../api/sessionTypes';
import type { ServerLife } from './useServerLife';
import { useSessionResource } from './useSessionResource';

export function useBudgetResource<K extends BudgetSection>(session: Session, server: ServerLife, section: K, enabled = true) {
  return useSessionResource(session, server, `budget:${section}`,
    (signal) => sessionsApi.getBudgetPage(session.id, section, signal), enabled);
}
