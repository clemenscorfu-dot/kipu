export function KipuLogo({compact=false,className=""}:{compact?:boolean;className?:string}){
  return (
    <div className={`inline-flex flex-col items-start ${className}`} aria-label="Kipu – Festhalten. Wiederfinden.">
      <img
        src="/schriftzug-master.png"
        alt="Kipu"
        className={`${compact?"h-7 max-w-[106px]":"h-10 max-w-[148px]"} w-auto object-contain`}
      />
      <span className={`${compact?"mt-0 text-[8px]":"mt-0.5 text-[9px]"} font-medium tracking-[0.02em] text-black/38`}>
        Festhalten. Wiederfinden.
      </span>
    </div>
  );
}
