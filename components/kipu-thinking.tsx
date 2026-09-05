type Props={label?:string;compact?:boolean};

export function KipuThinking({label="Kipu denkt nach",compact=false}:Props){
  return <div className={`kipu-thinking ${compact?"scale-[.82]":""}`}>
    <span className="kipu-orbit kipu-orbit-one"/>
    <span className="kipu-orbit kipu-orbit-two"/>
    <span className="kipu-spark kipu-spark-one">✦</span>
    <span className="kipu-spark kipu-spark-two">✧</span>
    <div className="kipu-bot">
      <span className="kipu-antenna"/>
      <span className="kipu-ear kipu-ear-left"/>
      <span className="kipu-ear kipu-ear-right"/>
      <span className="kipu-face"><i/><i/></span>
    </div>
    <span className="kipu-thinking-label">{label}</span>
  </div>
}
