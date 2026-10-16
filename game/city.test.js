import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY_STYLES, CITY_ROTATION, chooseRunCity } from './city.js';
import { LANDMARK_CITIES, landmarkRoute, visibleLandmarks, LANDMARK_SCROLL } from './landmarks.js';

test('automatic runs visit exactly the eight landmark cities before repeating', () => {
  const seen = [];
  let next = 'shanghai';
  for (let i = 0; i < 8; i++) {
    const pick = chooseRunCity('auto', 'harbor', next);
    seen.push(pick.city); next = pick.nextCity;
  }
  assert.equal(new Set(seen).size, 8);
  assert.deepEqual(seen, ['shanghai', 'ningbo', 'singapore', 'tokyo', 'paris', 'sydney', 'newyork', 'london']);
  assert.equal(next, 'shanghai');
  assert.equal(CITY_STYLES.some(style => style.id === 'rome'), false);
});

test('a fixed scene does not consume the automatic sequence and obsolete stored names recover', () => {
  for (let i = 0; i < 3; i++) assert.deepEqual(chooseRunCity('fixed', 'singapore', 'paris'), { city: 'singapore', nextCity: 'paris' });
  assert.deepEqual(chooseRunCity('auto', 'garden', 'removed-city'), { city: 'shanghai', nextCity: 'ningbo' });
  for (const removed of ['harbor', 'neon', 'garden', 'removed-city']) {
    assert.deepEqual(chooseRunCity('fixed', removed, 'tokyo'), { city: 'shanghai', nextCity: 'tokyo' });
    assert.deepEqual(chooseRunCity('auto', 'singapore', removed), { city: 'shanghai', nextCity: 'ningbo' });
  }
  assert.equal(CITY_ROTATION.length, CITY_STYLES.length);
});

test('ordinary streets separate landmarks, including at the loop boundary, throughout every route', () => {
  for (const city of LANDMARK_CITIES) {
    const route = landmarkRoute(city.id), observed = new Set();
    let hasOrdinaryStreet = false;
    assert.ok(route.items.length >= 3);
    for (let scroll = 0; scroll <= route.period; scroll += 7) {
      const visible = visibleLandmarks(city.id, scroll / LANDMARK_SCROLL);
      if (visible.length === 0) hasOrdinaryStreet = true;
      assert.ok(visible.length <= 1, `${city.id}: several landmarks crowd one screen`);
      assert.ok(visible.filter(item => item.screenX >= 0 && item.screenX + item.width <= 720).length <= 1);
      for (const item of visible) observed.add(item.id);
    }
    assert.deepEqual([...observed].sort(), route.items.map(item => item.id).sort());
    assert.ok(hasOrdinaryStreet, `${city.id}: no complete ordinary street between landmarks`);
    const atStart = visibleLandmarks(city.id, 0).map(item => [item.id, item.screenX]);
    const afterLoop = visibleLandmarks(city.id, route.period / LANDMARK_SCROLL).map(item => [item.id, Math.round(item.screenX * 1e6) / 1e6]);
    assert.deepEqual(afterLoop, atStart);
  }
});
