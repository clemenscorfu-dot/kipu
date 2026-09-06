import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

type GoldenCase={id:string;area:string;eval_type:"capture"|"search"|"rediscover"|"contract"|"manual";input:string;expect:Record<string,unknown>;priority:"P0"|"P1"|"P2";setup?:string};
const cases=JSON.parse(readFileSync(new URL("../evals/golden-cases.json",import.meta.url),"utf8")) as GoldenCase[];

test("golden eval corpus is valid and unique",()=>{
  assert.ok(cases.length>=40,"MVP corpus should cover at least 40 core cases");
  const ids=new Set<string>();
  for(const c of cases){
    assert.ok(c.id&&c.area&&c.input,"every case needs id, area and input");
    assert.ok(Object.keys(c.expect??{}).length>0,`${c.id} needs explicit expectations`);
    assert.ok(["P0","P1","P2"].includes(c.priority),`${c.id} has invalid priority`);
    assert.ok(["capture","search","rediscover","contract","manual"].includes(c.eval_type),`${c.id} has invalid eval_type`);
    assert.ok(!ids.has(c.id),`duplicate golden-case id: ${c.id}`);ids.add(c.id);
  }
});

test("P0 corpus covers the complete MVP loop",()=>{
  const p0=new Set(cases.filter(c=>c.priority==="P0").map(c=>c.area));
  for(const area of ["capture","place","entity","memory","duplicate","link","safety","reliability","rediscover","search","ui"])
    assert.ok(p0.has(area),`missing P0 coverage for ${area}`);
});

test("live capture corpus is large enough to expose regressions",()=>{
  const live=cases.filter(c=>c.eval_type==="capture"&&c.priority==="P0");
  assert.ok(live.length>=20,`expected >=20 P0 live capture cases, got ${live.length}`);
});

test("Muttseehütte regression coordinates stay pinned to the real subject",()=>{
  const c=cases.find(c=>c.id==="place-muttseehuette");assert.ok(c);
  assert.equal(c.expect.latitude,46.8575);assert.equal(c.expect.longitude,9.01875);
  assert.ok(Number(c.expect.coordinate_tolerance_km)<=1);
});

test("rediscover regression requires rotation",()=>{
  const c=cases.find(c=>c.id==="rediscover-rotation");assert.ok(c);
  assert.equal(c.expect.must_not_repeat_within_hours,72);assert.equal(c.expect.history_size,6);
});

test("map interaction contracts distinguish pin selection from locate",()=>{
  const pin=cases.find(c=>c.id==="nearby-map-pin"),locate=cases.find(c=>c.id==="nearby-locate");assert.ok(pin&&locate);
  assert.equal(pin.expect.must_not_jump_to_user_location,true);
  assert.equal(locate.expect.must_center_user_location,true);
});
