"use client";
import{useParams}from"next/navigation";import RelatedMemories from"@/components/related-memories";
export default function IdeaLayout({children}:{children:React.ReactNode}){const{id}=useParams<{id:string}>();return <div className="mx-auto w-full max-w-[430px] bg-[#fbfaf7]">{children}{id&&<div className="-mt-24 px-5 pb-28"><RelatedMemories ideaId={id}/></div>}</div>}
