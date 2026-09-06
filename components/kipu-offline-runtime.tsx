"use client";
import{useEffect}from"react";
import{flushOfflineIdeas}from"@/lib/kipu-offline";
export function KipuOfflineRuntime(){useEffect(()=>{if('serviceWorker'in navigator)void navigator.serviceWorker.register('/sw.js');const sync=()=>void flushOfflineIdeas();window.addEventListener('online',sync);if(navigator.onLine)sync();return()=>window.removeEventListener('online',sync)},[]);return null}
