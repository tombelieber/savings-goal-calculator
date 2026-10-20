(function(root){
 'use strict';
 const G=root.SavingsCalculator;
 function build(state,plan={},result=G.forecast(state,plan)){
  const months=result.rows.length;
  const oneOffTotal=result.totalOneOffIncome+G.cents(plan.onceNet??0);
  const remaining=Math.max(0,G.cents(state.goal)-result.startCash-oneOffTotal);
  return {
   requiredMonthly:Math.ceil(remaining/months),
   averageMonthly:Math.floor((result.growth-oneOffTotal)/months),
   extraMonthly:Math.ceil(Math.max(0,G.cents(state.goal)-result.ending)/months),
   oneOffTotal,
   rows:result.rows.map(row=>({
    month:row.month,income:row.income,spending:row.spending,bills:row.bills,tax:row.tax,
    reserves:row.bills+row.tax,saving:Math.max(0,row.netChange),drawdown:Math.max(0,-row.netChange),
    extraIncome:row.oneOffIncome+(row.month===state.endMonth?G.cents(plan.onceNet??0):0)
   }))
  };
 }
 root.PaydayPlan={build};
 if(typeof module!=='undefined')module.exports=root.PaydayPlan;
})(typeof window==='undefined'?globalThis:window);
