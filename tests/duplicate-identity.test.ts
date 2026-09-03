import test from "node:test";
import assert from "node:assert/strict";
import { deterministicIdentityMatch, normalizeUrl } from "../lib/kipu-duplicate-identity.ts";
const high=(a:any,b:any)=>assert.equal(deterministicIdentityMatch(a,b).confidence,"high");
const notHigh=(a:any,b:any)=>assert.notEqual(deterministicIdentityMatch(a,b).confidence,"high");

test("A same POI, different personal context",()=>high({title:"Sternen Kulturbeiz in Rüti",canonical_name:"Sternen Kulturbeiz",latitude:47.258,longitude:8.856},{title:"Mit Lydia im Sternen essen gehen",location_label:"Sternen Kulturbeiz, Rüti",latitude:47.25802,longitude:8.85601}));
test("B same book across title/photo after entity resolution",()=>high({title:"Momo – Michael Ende",identifiers:[{type:"isbn",value:"978-3-522-20210-7"}]},{title:"Momo",enrichment:{facts:[{label:"ISBN",value:"9783522202107"}]}}));
test("C same web article normalized URL",()=>high({urls:["https://example.com/story?id=7&utm_source=x"]},{urls:["https://example.com/story?id=7"]}));
test("D same product after visual identification",()=>high({title:"Produkt X",identifiers:[{type:"gtin",value:"7612345678901"}]},{title:"Foto Produkt X",enrichment:{facts:[{label:"GTIN",value:"7612345678901"}]}}));
test("E different books by same author are not duplicates",()=>assert.equal(deterministicIdentityMatch({title:"Momo",people:["Michael Ende"]},{title:"Die unendliche Geschichte",people:["Michael Ende"]}).confidence,"none"));
test("F different branches of same chain are not automatically high",()=>notHigh({canonical_name:"Restaurant Kette",latitude:47.37,longitude:8.54},{canonical_name:"Restaurant Kette",latitude:47.50,longitude:8.73}));
test("G similar idea, different concrete object",()=>assert.equal(deterministicIdentityMatch({title:"roter Campingstuhl"},{title:"grüner Campingtisch"}).confidence,"none"));
test("H same entity, different intention",()=>high({title:"Restaurant ausprobieren",canonical_name:"Sternen Kulturbeiz",latitude:47.258,longitude:8.856},{title:"Mit Lydia dort essen gehen",location_label:"Sternen Kulturbeiz",latitude:47.25801,longitude:8.85602}));
test("I tracking parameters are removed",()=>assert.equal(normalizeUrl("https://www.example.com/a/?utm_campaign=x&b=2&a=1#x"),"https://example.com/a?a=1&b=2"));
test("J same ISBN/external ID is deterministic high",()=>{high({identifiers:[{type:"isbn",value:"9783522202107"}]},{enrichment:{facts:[{label:"ISBN",value:"978-3-522-20210-7"}]}});high({identifiers:[{type:"imdb",value:"tt0133093"}]},{enrichment:{facts:[{label:"IMDb ID",value:"tt0133093"}]}})});
