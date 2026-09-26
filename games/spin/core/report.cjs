'use strict';
// Offline population of the artifact-tool authored workbook. We retain its native
// styles, charts and validations; only the event snapshot and formula caches vary.
const fs=require('node:fs'),path=require('node:path');
const {unzipSync,zipSync,strFromU8,strToU8}=require('fflate');
const {reportModel,col}=require('./report-model.cjs');
const templatePath=path.join(__dirname,'../assets/reports/management-template.xlsx');
const escapeXml=v=>String(v??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const unescapeXml=v=>v.replaceAll('&apos;',"'").replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
const attribute=(s,key)=>s.match(new RegExp('(?:^|\\s)'+key+'="([^"]*)"'))?.[1];
function cellXml(address,cell,style){
 const attrs=` r="${address}"${style===undefined?'':` s="${style}"`}`,v=cell?.v;
 if(cell?.f){const type=typeof v==='string'?' t="str"':typeof v==='boolean'?' t="b"':'';return `<x:c${attrs}${type}><x:f>${escapeXml(cell.f.slice(1))}</x:f><x:v>${escapeXml(typeof v==='boolean'?Number(v):v)}</x:v></x:c>`;}
 if(v===null||v===undefined)return `<x:c${attrs}/>`;
 if(typeof v==='number'){if(!Number.isFinite(v))throw Error('Non-finite workbook number');return `<x:c${attrs}><x:v>${v}</x:v></x:c>`;}
 if(typeof v==='boolean')return `<x:c${attrs} t="b"><x:v>${Number(v)}</x:v></x:c>`;
 // Every source string is literal, including values beginning with = + - @ and leading-zero shades.
 return `<x:c${attrs} t="inlineStr"><x:is><x:t xml:space="preserve">${escapeXml(v)}</x:t></x:is></x:c>`;
}
function populateSheet(xml,definition){
 const section=xml.match(/<x:sheetData>([\s\S]*?)<\/x:sheetData>/);if(!section)throw Error('Report template has no sheetData');
 const rows=new Map(),styles={};
 for(const m of section[1].matchAll(/<x:row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/x:row>)/g)){
  const r=Number(attribute(m[1],'r')),cells=new Map();
  for(const c of (m[2]||'').matchAll(/<x:c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/x:c>)/g)){const address=attribute(c[1],'r');cells.set(address,c[0]);styles[address]=attribute(c[1],'s');}
  rows.set(r,{attrs:m[1],cells});
 }
 if(definition.body){const b=definition.body;for(const r of rows.keys())if(r>=b.start)rows.delete(r);for(let r=b.start;r<=b.end;r++){const cells=new Map();for(let c=0;c<b.columns;c++){const address=col(c)+r;cells.set(address,cellXml(address,definition.cells[address],styles[col(c)+b.start]));}rows.set(r,{attrs:` r="${r}" ht="48" customHeight="1"`,cells});}}
 for(const [address,cell]of Object.entries(definition.cells)){
  const r=Number(address.match(/\d+/)[0]);if(definition.body&&r>=definition.body.start)continue;
  if(!rows.has(r))rows.set(r,{attrs:` r="${r}"`,cells:new Map()});rows.get(r).cells.set(address,cellXml(address,cell,styles[address]));
 }
 const rank=a=>a.match(/[A-Z]+/)[0].split('').reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
 const body=[...rows].sort((a,b)=>a[0]-b[0]).map(([,r])=>`<x:row${r.attrs}>${[...r.cells].sort((a,b)=>rank(a[0])-rank(b[0])).map(([,x])=>x).join('')}</x:row>`).join('');
 xml=xml.replace(section[0],`<x:sheetData>${body}</x:sheetData>`);
 if(definition.body){const b=definition.body;xml=xml.replace(/sqref="([A-Z]+)(\d+):([A-Z]+)(\d+)"/g,(m,c1,r1,c2)=>Number(r1)===b.start?`sqref="${c1}${b.start}:${c2}${b.end}"`:m);}
 return xml;
}
function chartValues(formula,model){const m=unescapeXml(formula).match(/^'([^']+)'!\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)$/);if(!m||m[2]!==m[4])throw Error('Unexpected chart source');const cells=model.sheets[m[1]]?.cells;if(!cells)throw Error('Missing chart sheet');return Array.from({length:+m[5]-+m[3]+1},(_,i)=>cells[m[2]+(+m[3]+i)]?.v??0);}
function populateChart(xml,model){return xml.replace(/<c:(numRef|strRef)>([\s\S]*?)<\/c:\1>/g,(block,type,content)=>{const formula=content.match(/<c:f>([\s\S]*?)<\/c:f>/)?.[1];if(!formula)return block;const values=chartValues(formula,model),cache=type==='numRef'?'numCache':'strCache';const points=values.map((v,i)=>`<c:pt idx="${i}"><c:v>${escapeXml(v)}</c:v></c:pt>`).join('');return `<c:${type}><c:f>${formula}</c:f><c:${cache}>${type==='numRef'?'<c:formatCode>0</c:formatCode>':''}<c:ptCount val="${values.length}"/>${points}</c:${cache}></c:${type}>`;});}
function managementReport(state,options={}){
 const model=reportModel(state,options),zip=unzipSync(fs.readFileSync(templatePath)),names=Object.keys(model.sheets);
 names.forEach((name,i)=>{
  const file=`xl/worksheets/sheet${i+1}.xml`;if(!zip[file])throw Error('Missing report template sheet');let xml=populateSheet(strFromU8(zip[file]),model.sheets[name]);
  const freeze=model.sheets[name].body?.header||({Rekomendasi:8,Ringkasan:4,Panduan:5}[name]??0);
  if(freeze)xml=xml.replace(/<x:sheetView\b([^>]*?)\s*\/>/,`<x:sheetView$1><x:pane ySplit="${freeze}" topLeftCell="A${freeze+1}" activePane="bottomLeft" state="frozen"/><x:selection pane="bottomLeft" activeCell="A${freeze+1}" sqref="A${freeze+1}"/></x:sheetView>`);
  zip[file]=strToU8(xml);
 });
 for(const file of Object.keys(zip)){
  if(/\/charts\/chart\d+\.xml$/.test(file))zip[file]=strToU8(populateChart(strFromU8(zip[file]),model));
  if(/^xl\/tables\/table\d+\.xml$/.test(file)){
   let xml=strFromU8(zip[file]);const name=attribute(xml.match(/<x:table\b([^>]+)>/)[1],'name'),def=Object.values(model.sheets).find(s=>s.body?.table===name);if(!def)throw Error('Unexpected table in report');const b=def.body,ref=`A${b.header}:${col(b.columns-1)}${b.end}`;
   xml=xml.replace(/\bref="[^"]+"/g,`ref="${ref}"`);if(!xml.includes('<x:autoFilter'))xml=xml.replace('<x:tableColumns',`<x:autoFilter ref="${ref}"/><x:tableColumns`);zip[file]=strToU8(xml);
  }
 }
 let workbook=strFromU8(zip['xl/workbook.xml']);workbook=workbook.replace(/<x:calcPr\b[^>]*\/>/,'').replace('</x:workbook>','<x:calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/></x:workbook>');zip['xl/workbook.xml']=strToU8(workbook);
 return Buffer.from(zipSync(zip,{level:6}));
}
module.exports={managementReport,cellXml};
