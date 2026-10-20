(function(root){
 'use strict';
 function create({get,money,monthText}){
  let data=null,selectedMonth='';
  const picker=get('payday-month');
  function showMonth(){
   if(!data)return;
   const row=data.rows.find(row=>row.month===selectedMonth)||data.rows[0];
   selectedMonth=row.month;picker.value=row.month;
   for(const key of ['income','spending','reserves','saving'])get('payday-'+key).textContent=money(row[key]);
   get('payday-save-label').textContent=row.drawdown?'今月暫時儲唔到':'轉入目標儲蓄';
   get('payday-drawdown').hidden=!row.drawdown;
   get('payday-drawdown').textContent=row.drawdown?`本月支出比收入多 ${money(row.drawdown)}，要動用現有儲蓄。`:'';
   const notes=[];
   if(row.extraIncome)notes.push(`當月額外收入 ${money(row.extraIncome)} 已計入，餘額全數儲起。`);
   if(row.tax)notes.push(`帳單及預留含稅金 ${money(row.tax)}，只喺呢個月扣起。`);
   get('payday-note').textContent=notes.join(' ');
  }
  picker.addEventListener('change',()=>{selectedMonth=picker.value;showMonth();});
  function render(state,plan,result){
   data=PaydayPlan.build(state,plan,result);picker.disabled=false;
   get('monthly-required').textContent=money(data.requiredMonthly);
   get('monthly-current-label').textContent=data.averageMonthly<0?'按目前收支，每月平均倒貼':'按目前收支，每月平均儲到';
   get('monthly-current').textContent=money(Math.abs(data.averageMonthly));
   get('monthly-gap-label').textContent=data.extraMonthly?'要準時達標，每月仲要騰出':'按目前收支，目標月可達標';
   get('monthly-gap').textContent=data.extraMonthly?money(data.extraMonthly):'';
   get('monthly-gap-row').dataset.status=data.extraMonthly?'short':'ready';
   const basis=[];
   if(result.startCash)basis.push(`現有儲蓄 ${money(result.startCash)}`);
   if(data.oneOffTotal)basis.push(`期間額外收入 ${money(data.oneOffTotal)}`);
   get('monthly-basis').textContent=basis.length?'已計入'+basis.join('、')+'。':'';
   const months=data.rows.map(row=>row.month);
   if([...picker.options].map(option=>option.value).join()!==months.join()){
    picker.replaceChildren(...months.map(month=>{const option=document.createElement('option');option.value=month;option.textContent=monthText(month);return option;}));
   }
   showMonth();return data;
  }
  function clear(){
   data=null;picker.disabled=true;
   for(const id of ['monthly-required','monthly-current','payday-income','payday-spending','payday-reserves','payday-saving'])get(id).textContent='—';
   for(const id of ['monthly-basis','monthly-gap','monthly-gap-label','payday-note','payday-drawdown'])get(id).textContent='';
   get('payday-drawdown').hidden=true;get('payday-save-label').textContent='轉入目標儲蓄';
  }
  return {render,clear};
 }
 root.PaydayView={create};
})(typeof window==='undefined'?globalThis:window);
