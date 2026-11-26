import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameFamilyFacts, gameFamilySummary } from '../src/game/serverPresentation.ts';
import { birthAndLifeSession } from './fixtures/birthAndLifeSession.mjs';

test('game family facts show parents with their names and professions without repeating the name', () => {
  const family = birthAndLifeSession().simulation.family.filter((person) => ['mother', 'father'].includes(person.role));
  family[0].name = 'Эмма';
  family[0].occupation = 'Водитель, инструктор';
  family[1].name = 'Габриэль';
  family[1].occupation = 'Водитель';
  const before = structuredClone(family);
  assert.deepEqual(gameFamilyFacts({ mother: 'Эмма, Водитель', father: 'Габриэль, Водитель' }, family), [
    { id: 'mother-custom-id', label: 'Мама', value: 'Эмма, Водитель, инструктор' },
    { id: 'father', label: 'Папа', value: 'Габриэль, Водитель' },
  ]);
  assert.deepEqual(family, before);
  family[0].occupation = null;
  assert.equal(gameFamilyFacts({ mother: 'Эмма, Водитель' }, [family[0]])[0].value, 'Эмма, Водитель');
});

test('server sibling facts show names, omit absent siblings and retain different IDs with the same name', () => {
  const template = birthAndLifeSession().simulation.family.find((person) => person.role === 'sister');
  const brother = { ...template, id: 'brother-1', role: 'brother', sex: 'MALE' };
  const sister = { ...template, id: 'sister-1', role: 'sister' };
  assert.deepEqual(gameFamilyFacts({ siblings: '3' }, []), []);
  const brotherRow = { id: 'siblings-brother', label: 'Брат', value: 'Юи' };
  const sisterRow = { id: 'siblings-sister', label: 'Сестра', value: 'Юи' };
  assert.deepEqual(gameFamilyFacts({}, [brother]), [brotherRow]);
  assert.deepEqual(gameFamilyFacts({}, [sister]), [sisterRow]);
  assert.deepEqual(gameFamilyFacts({}, [brother, sister]), [brotherRow, sisterRow]);
  assert.deepEqual(gameFamilyFacts({}, [brother, brother, { ...brother, id: 'brother-2' }]), [
    { id: 'siblings-brother', label: 'Братья', value: 'Юи, Юи' },
  ]);
  assert.deepEqual(gameFamilyFacts({}, [{ ...brother, role: 'sibling', sex: null, name: 'Саша' }]), [
    { id: 'siblings-unknown', label: 'Брат / сестра', value: 'Саша' },
  ]);
});

test('old saves without sibling names remain explicit and mock names match the selected composition', () => {
  for (const label of [null, undefined, '', 'Нет', '0']) {
    assert.deepEqual(gameFamilyFacts({ siblings: label }), []);
  }
  for (const [siblings, expected] of [
    ['Один брат', ['Брат: Хару.',]], ['Одна сестра', ['Сестра: Хару.']],
    ['Брат и сестра', ['Брат: Хару.', 'Сестра: Аой.']],
    ['Два брата', ['Братья: Хару, Аой.']], ['Две сестры', ['Сёстры: Хару, Аой.']],
  ]) {
    const lines = gameFamilyFacts({ siblings }, undefined, undefined, ['Хару', 'Аой'])
      .map((fact) => `${fact.label}: ${fact.value}.`);
    assert.deepEqual(lines, expected);
  }
  const birth = { mother: { occupation: { code: 'driver', label: 'Водитель' } }, siblings: [{ sex: 'FEMALE' }] };
  assert.deepEqual(gameFamilyFacts({ mother: 'Эмма, Водитель', siblings: '0' }, undefined, birth), [
    { id: 'mother', label: 'Мама', value: 'Водитель' },
    { id: 'siblings-sister', label: 'Сестра', value: 'имя неизвестно' },
  ]);
  assert.deepEqual(gameFamilyFacts({ siblings: '1' }, undefined, { siblings: [] }), []);
});

test('family relationships follow sibling names and are not repeated without a label', () => {
  const family = birthAndLifeSession().simulation.family;
  assert.deepEqual(gameFamilyFacts({ relationships: 'Тёплые и крепкие.' }, family), [
    { id: 'mother-custom-id', label: 'Мама', value: 'Эми, Учитель' },
    { id: 'father', label: 'Папа', value: 'Кэн' },
    { id: 'siblings-brother', label: 'Брат', value: 'Юи' },
    { id: 'siblings-sister', label: 'Сестра', value: 'Юи' },
    { id: 'relationships', label: 'Отношения в семье', value: 'Тёплые и крепкие' },
  ]);
  assert.deepEqual(gameFamilyFacts({ relationships: 'Сдержанные отношения' }, []), [
    { id: 'relationships', label: 'Отношения в семье', value: 'Сдержанные отношения' },
  ]);
  assert.deepEqual(gameFamilyFacts({ relationships: '  ' }, []), []);
});

test('same-role parents keep separate stable rows, names and their own occupations', () => {
  const family = birthAndLifeSession().simulation.family;
  family[1].role = 'mother';
  family[1].name = 'Эми';
  family[1].occupation = 'Инженер';
  const facts = gameFamilyFacts({}, [family[0], family[1], family[0]]);
  assert.deepEqual(facts, [
    { id: 'mother-custom-id', label: 'Мама', value: 'Эми, Учитель' },
    { id: 'father', label: 'Мама', value: 'Эми, Инженер' },
  ]);
  const mock = gameFamilyFacts({ mother: 'Врач', father: 'Инженер' }, undefined, undefined, undefined, { mother: 'Акико' });
  assert.deepEqual(mock, [{ id: 'mother', label: 'Мама', value: 'Акико, Врач' }]);
  assert.deepEqual(gameFamilyFacts({ mother: 'Врач', father: 'Инженер' }, []), []);
});

test('family caption names actual parents and counts siblings by stable ID rather than name', () => {
  const family = birthAndLifeSession().simulation.family;
  family.find((person) => person.role === 'father').alive = true;
  const brother = family.find((person) => person.role === 'brother');
  family.push({ ...brother, id: 'second-brother', name: brother.name });
  const original = structuredClone(family);
  assert.equal(gameFamilySummary({ family: 'Мать и отец' }, [...family, brother]), 'Мама, Папа, два брата, сестра');
  assert.deepEqual(family, original);
  assert.equal(gameFamilySummary({ family: 'Мать и отец' }, [family[0]]), 'Мама');
  assert.equal(gameFamilySummary({ family: 'Мать и отец', siblings: 'Два брата' }, []), '');
  const siblings = Array.from({ length: 5 }, (_, index) => ({ ...brother, id: `b-${index}` }));
  assert.equal(gameFamilySummary({}, siblings), 'пять братьев');
});

test('family caption uses known sex for generic siblings and includes living relatives without friends', () => {
  const base = birthAndLifeSession().simulation.family[0];
  const family = [
    { ...base, id: 'mother', role: 'mother', alive: false },
    { ...base, id: 'father', role: 'father' },
    { ...base, id: 'girl-1', role: 'sibling', sex: 'FEMALE' },
    { ...base, id: 'girl-2', role: 'sibling', sex: 'FEMALE' },
    { ...base, id: 'partner', role: 'partner' },
    { ...base, id: 'child', role: 'child' },
    { ...base, id: 'friend', role: 'friend' },
  ];
  assert.equal(gameFamilySummary({}, family), 'Папа, две сестры, партнёр, ребёнок');
});

test('family captions support two same-role parents and old or mock saves without replacing missing data', () => {
  const base = birthAndLifeSession().simulation.family[0];
  assert.equal(gameFamilySummary({}, [base, { ...base, id: 'second-mother' }]), 'две мамы');
  assert.equal(gameFamilySummary({ family: 'Полная семья', siblings: 'Брат и сестра' }), 'Мама, Папа, брат, сестра');
  assert.equal(gameFamilySummary({ family: 'Только мама', siblings: 'Два брата' }), 'Мама, два брата');
  assert.equal(gameFamilySummary({ family: 'Две матери', siblings: 'Нет' }), 'две мамы');
  assert.equal(gameFamilySummary({ siblings: '3' }), 'три брата / сестры');
  assert.equal(gameFamilySummary({}, undefined, {
    familyType: 'TWO_FATHERS', siblings: [{ sex: 'FEMALE' }],
  }), 'два папы, сестра');
  assert.equal(gameFamilySummary({}), '');
  assert.equal(gameFamilySummary({ family: 'Семья опекунов', siblings: 'Одна сестра' }), 'Семья опекунов, сестра');
  assert.equal(gameFamilySummary({ family: 'Нет данных' }), '');
});
