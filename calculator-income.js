(function(root){
 'use strict';
 const G=root.SavingsCalculator;
 const amount=value=>['number','string'].includes(typeof value)?value:'';
 function syncTotals(state){
  const salary=state.incomeItems.find(row=>row.id==='salary');
  const others=state.incomeItems.filter(row=>row.id!=='salary');
  state.monthlyIncome=salary?salary.amount:0;
  state.otherMonthly=others.every(row=>G.amountOK(row.amount))?others.reduce((sum,row)=>sum+G.cents(row.amount),0)/100:'';
  return state;
 }
 function initialise(state,items){
  if(Array.isArray(items)){
   const ids=new Set();
   state.incomeItems=items.slice(0,12).map((row,i)=>{
    let id=typeof row?.id==='string'&&/^[a-z][a-z0-9]{0,31}$/.test(row.id)?row.id:'i'+(i+1);
    let duplicate=0;while(ids.has(id))id='i'+(i+1)+'x'+(++duplicate);
    ids.add(id);return {id,name:typeof row?.name==='string'?row.name.slice(0,60):'',amount:amount(row?.amount)};
   });
  }else state.incomeItems=[{id:'salary',name:'我每個月人工',amount:state.monthlyIncome},{id:'other',name:'我其他每月收入',amount:state.otherMonthly}];
  return syncTotals(state);
 }
 function control(row){return row.id==='salary'?{key:'monthlyIncome',id:'monthlyIncome',rangeId:'salary-slider',defaultMax:200000}:row.id==='other'?{key:'otherMonthly',id:'otherMonthly',rangeId:'other-slider',defaultMax:100000}:{key:'income-'+row.id,id:'income-amount-'+row.id,rangeId:'income-slider-'+row.id,defaultMax:100000};}
 function findByControl(state,key){return state.incomeItems.find(row=>control(row).key===key);}
 function add(state){
  if(state.incomeItems.length>=12)return null;
  let n=1;while(state.incomeItems.some(row=>row.id==='i'+n))n++;
  const row={id:'i'+n,name:'',amount:0};state.incomeItems.push(row);syncTotals(state);return row;
 }
 function remove(state,id){state.incomeItems=state.incomeItems.filter(row=>row.id!==id);syncTotals(state);}
 function update(state,id,value){const row=state.incomeItems.find(row=>row.id===id);if(row){row.amount=value;syncTotals(state);}}
 root.CalculatorIncome={initialise,syncTotals,control,findByControl,add,remove,update};
 if(typeof module!=='undefined')module.exports=root.CalculatorIncome;
})(typeof window==='undefined'?globalThis:window);
