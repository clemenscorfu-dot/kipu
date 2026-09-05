const DB_NAME="kipu-camera";
const STORE_NAME="captures";
const KEY="latest";

function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error??new Error("camera_store_open_failed"))})}

export async function saveCameraCapture(file:Blob){const db=await openDb();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE_NAME,"readwrite"),store=tx.objectStore(STORE_NAME);store.put(file,KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error??new Error("camera_store_write_failed"));tx.onabort=()=>reject(tx.error??new Error("camera_store_write_aborted"))})}finally{db.close()}}

export async function loadCameraCapture():Promise<Blob|null>{const db=await openDb();try{return await new Promise<Blob|null>((resolve,reject)=>{const tx=db.transaction(STORE_NAME,"readonly"),req=tx.objectStore(STORE_NAME).get(KEY);req.onsuccess=()=>resolve(req.result instanceof Blob?req.result:null);req.onerror=()=>reject(req.error??new Error("camera_store_read_failed"))})}finally{db.close()}}

export async function clearCameraCapture(){const db=await openDb();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE_NAME,"readwrite");tx.objectStore(STORE_NAME).delete(KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error??new Error("camera_store_delete_failed"))})}finally{db.close()}}
