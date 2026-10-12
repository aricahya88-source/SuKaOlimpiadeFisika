import { MathHtml } from '@/components/math-html';
import type { QuestionRecord, MatchingInteractionData } from '@/lib/api';

function interaction(q:QuestionRecord):MatchingInteractionData|null{
 try{const value=typeof q.interactionData==='string'?JSON.parse(q.interactionData):q.interactionData;return value&&Array.isArray(value.left)&&Array.isArray(value.right)?value:null;}catch{return null;}
}
export function ValidatorMatchingPreview({question}:{question:QuestionRecord}){
 const data=interaction(question);
 if(!data)return <p role="alert">Data pernyataan dan pilihan pasangan belum tersedia.</p>;
 return <div className="validator-matching-columns">{(['left','right'] as const).map(side=><section key={side}><h4>{side==='left'?'Pernyataan':'Pilihan pasangan'}</h4>{data[side].map((item,i)=><div className="validator-matching-item" key={item.id}><b>{side==='left'?i+1:String.fromCharCode(65+i)}.</b><MathHtml html={item.text}/></div>)}</section>)}</div>;
}
export function ValidatorAnswerReview({question}:{question:QuestionRecord}){
 const key=String(question.correctAnswers||question.correctAnswer||'').trim();const data=interaction(question);
 const pairs=key.split('|').filter(Boolean).map(pair=>pair.split(':').map(s=>s.trim()));
 const keys=key.split(',').map(s=>s.trim());
 const option=(k:string)=>(question as unknown as Record<string,unknown>)[`option${k}`];
 return <section className="panel validator-answer-review"><h3>Kunci jawaban</h3>{!key?<p role="alert">Kunci jawaban belum diisi.</p>:question.questionType==='MATCHING'?<>
 {data?<div className="table-wrap"><table><thead><tr><th>Pernyataan</th><th>Pasangan yang benar</th></tr></thead><tbody>{pairs.map(([l,r],i)=>{
 const left=data.left.find(item=>item.id===l)||data.left[Number(l)-1];const right=data.right.find(item=>item.id===r)||data.right[Number(r)-1];
 return <tr key={i}><td>{left?<MathHtml html={left.text}/>:<span>Pasangan {l} tidak ditemukan</span>}</td><td>{right?<MathHtml html={right.text}/>:<span>Pasangan {r} tidak ditemukan</span>}</td></tr>;
 })}</tbody></table></div>:<p>Data pasangan belum tersedia.</p>}<p className="validator-key-code">Kode kunci: {key}</p></>:question.questionType==='TRUE_FALSE'?<ol>{keys.map((value,i)=><li key={i}>Pernyataan {i+1}: <strong>{['TRUE','T','BENAR','B'].includes(value.toUpperCase())?'Benar':['FALSE','F','SALAH','S'].includes(value.toUpperCase())?'Salah':value}</strong></li>)}</ol>:<div className="validator-key-options">{keys.map(k=><div key={k}><b>{k}</b>{option(k)?<MathHtml html={String(option(k))}/>:<span>Isi opsi belum tersedia.</span>}</div>)}</div>}
 <h3>Pembahasan</h3>{question.explanation?.trim()?<MathHtml html={question.explanation}/>:<p>Pembahasan belum diisi oleh penulis soal.</p>}</section>;
}
