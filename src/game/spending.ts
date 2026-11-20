import { getShopItems } from '../mocks/spendingCatalog.ts';
import type { ShopSection } from '../mocks/spendingCatalog.ts';
import type { LifeEvent } from '../mocks/lifeEvents.ts';

export type Purchase = {
  id: string;
  age: number;
  section: ShopSection;
  itemId: string;
  country: string;
  petName?: string;
};

export function purchaseEvents(purchases: Purchase[], age: number): LifeEvent[] {
  return purchases.flatMap((purchase) => {
    if (purchase.age > age) return [];
    const item = getShopItems(purchase.section, purchase.country).find((entry) => entry.id === purchase.itemId);
    if (!item) return [];
    const events: LifeEvent[] = [{
      id: purchase.id,
      age: purchase.age,
      title: item.title,
      text: purchase.section === 'pets'
        ? `В доме появился питомец: ${item.title.toLowerCase()}, ${purchase.petName}.`
        : item.location ? `Переезд: ${item.location.country}, ${item.location.city}.` : `Оплачено: ${item.title.toLowerCase()}.`,
      changes: item.changes || {},
      money: { expenses: item.price },
      yearlyCost: item.yearlyCost,
      appearance: item.appearance,
      closeness: purchase.section === 'relationships' ? { mother: 1, father: 1, friend: 2 } : {},
    }];
    if (item.durationMonths && purchase.age + item.durationMonths / 12 <= age) {
      events.push({
        id: `${purchase.id}-completed`,
        age: purchase.age + item.durationMonths / 12,
        title: `Обучение завершено: ${item.title}`,
        text: `Курс «${item.title}» завершён. Получены навыки по новой специальности.`,
        changes: { intelligence: 4 },
      });
    }
    return events;
  });
}
