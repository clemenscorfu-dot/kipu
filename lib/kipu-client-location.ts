export type KipuClientLocation={latitude:number|null;longitude:number|null};
let cached:{value:KipuClientLocation;at:number}|null=null;
let pending:Promise<KipuClientLocation>|null=null;
const MAX_AGE=5*60_000;

export function getCachedLocation():KipuClientLocation|null{
  return cached&&Date.now()-cached.at<MAX_AGE?cached.value:null;
}

export function getKipuLocation(options:{timeout?:number;highAccuracy?:boolean}={}):Promise<KipuClientLocation>{
  const hit=getCachedLocation();if(hit)return Promise.resolve(hit);
  if(pending)return pending;
  if(typeof navigator==="undefined"||!navigator.geolocation)return Promise.resolve({latitude:null,longitude:null});
  pending=new Promise(resolve=>navigator.geolocation.getCurrentPosition(
    p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude}),
    ()=>resolve({latitude:null,longitude:null}),
    {enableHighAccuracy:options.highAccuracy??false,timeout:options.timeout??1500,maximumAge:MAX_AGE}
  )).then(value=>{cached={value,at:Date.now()};return value}).finally(()=>{pending=null});
  return pending;
}

export function warmKipuLocation(){void getKipuLocation({timeout:1200})}
