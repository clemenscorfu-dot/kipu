export function KipuLogo({compact=false,className=""}:{compact?:boolean;className?:string}){
  return (
    <div className={`inline-flex flex-col items-start ${className}`} aria-label="Kipu – Festhalten. Wiederfinden.">
      <img
        src="/schriftzug-master.png"
        alt="Kipu"
        className={`${compact?"h-8 max-w-[118px]":"h-10 max-w-[148px]"} w-auto object-contain`}
      />
      <span className="mt-0.5 text-[9px] font-medium tracking-[0.015em] text-black/40">
        Festhalten. Wiederfinden.
      </span>
    </div>
  );
}
