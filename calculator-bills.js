(function(root){
 'use strict';
 const G=root.SavingsCalculator;
 const definitions=[
  {key:'housing',label:'我嘅租金／供樓',defaultMax:100000},
  {key:'management',label:'我嘅管理費',defaultMax:10000,hint:'可填0；按你的實際收費調整。'},
  {key:'electricity',label:'電費',defaultMax:10000},
  {key:'water',label:'水費',defaultMax:8000},
  {key:'gas',label:'煤氣',defaultMax:10000},
  {key:'mobile',label:'我嘅手機月費',defaultMax:2000},
  {key:'internet',label:'我嘅上網月費',defaultMax:2000},
  {key:'rates',label:'我每季差餉／地租',defaultMax:30000,hint:'每季金額除以3作每月預留；唔代表實際付款月份。'},
  {key:'other',label:'其他帳單／未拆項總額',defaultMax:50000}
 ];
 const empty=()=>Object.fromEntries(G.billFields.map(key=>[key,0]));
 const example=()=>({housing:8000,management:0,electricity:300,water:50,gas:150,mobile:100,internet:200,rates:0,insurance:0,other:0});
 function initialise(state,savedItems,source){
  if(savedItems&&typeof savedItems==='object'&&!Array.isArray(savedItems)){
   state.billItems=Object.fromEntries(G.billFields.map(key=>[key,['string','number'].includes(typeof savedItems[key])?savedItems[key]:0]));
   state.billSource=['example','custom','legacy'].includes(source)?source:'custom';
   // Keep both saved values for the model to reject any mismatch rather than silently repairing it.
  }else{state.billItems={...empty(),other:state.billsMonthly===''?0:state.billsMonthly};state.billSource='legacy';}
  return state;
 }
 function setExample(state){state.billItems=example();state.billSource='example';state.billsMonthly=G.billTotal(state.billItems)/100;return state;}
 function setEmpty(state){state.billItems=empty();state.billSource='custom';state.billsMonthly=0;return state;}
 function retotal(state){
  const valid=G.billFields.every(name=>G.isAmount(state.billItems[name])&&Number(state.billItems[name])>=0&&Number(state.billItems[name])<=1e8);
  state.billsMonthly=valid?G.billTotal(state.billItems)/100:'';
 }
 function update(state,key,value){state.billItems[key]=value;retotal(state);if(key==='other'||state.billSource!=='legacy')state.billSource='custom';}
 root.CalculatorBills={definitions,empty,example,initialise,setExample,setEmpty,retotal,update};
 if(typeof module!=='undefined')module.exports=root.CalculatorBills;
})(typeof window==='undefined'?globalThis:window);
