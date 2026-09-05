type PreviewRecord={idea:any;at:number};
const TTL=5*60_000;
function key(id:string){return`kipu-idea-preview:${id}`}
export function stashIdeaPreview(idea:any){if(typeof sessionStorage==="undefined"||!idea?.id)return;try{sessionStorage.setItem(key(String(idea.id)),JSON.stringify({idea,at:Date.now()} satisfies PreviewRecord))}catch{}}
export function readIdeaPreview<T=any>(id:string):T|null{if(typeof sessionStorage==="undefined")return null;try{const raw=sessionStorage.getItem(key(id));if(!raw)return null;const parsed=JSON.parse(raw)as PreviewRecord;if(!parsed?.idea||Date.now()-Number(parsed.at)>TTL){sessionStorage.removeItem(key(id));return null}return parsed.idea as T}catch{return null}}
export function clearIdeaPreview(id:string){if(typeof sessionStorage==="undefined")return;try{sessionStorage.removeItem(key(id))}catch{}}
