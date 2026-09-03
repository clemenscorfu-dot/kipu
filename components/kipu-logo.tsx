export function KipuLogo({compact=false,className=""}:{compact?:boolean;className?:string}){
  return (
    <div className={`inline-flex items-center ${className}`} aria-label="Kipu">
      <img
        src="/schriftzug-master.png"
        alt="Kipu"
        className={`${compact?"h-8 max-w-[118px]":"h-10 max-w-[148px]"} w-auto object-contain`}
      />
    </div>
  );
}
