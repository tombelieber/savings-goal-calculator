const {test}=require('node:test'),assert=require('node:assert/strict');
const G=require('./calculator-model.js'),B=require('./calculator-bills.js'),I=require('./calculator-income.js'),C=require('./calculator-costs.js');
const fixture=()=>C.initialise(I.initialise(B.setExample({...G.example(),startMonth:'2099-01',endMonth:'2099-12'})));
test('default goal is300k and horizon is twelve complete future months across year/leap boundaries',()=>{
 assert.equal(G.example().goal,300000);assert.equal(G.example().startCash,0);assert.deepEqual(G.example().oneOffs,[]);
 for(const [now,start,end] of [[new Date(2099,9,20),'2099-11','2100-10'],[new Date(2099,11,31),'2100-01','2100-12'],[new Date(2096,1,29),'2096-03','2097-02']]){assert.deepEqual(G.defaultMonths(now),{startMonth:start,endMonth:end});assert.equal(G.monthRange(start,end).length,12);}
});
test('fictional default conserves all cash and has no hidden bonus or starting balance',()=>{
 const s=fixture(),r=G.forecast(s),t=G.targetReport(s,r);
 assert.equal(r.ending,19440000);assert.equal(t.shortfall,10560000);assert.equal(r.totalBills,10560000);assert.equal(r.totalSpending,6000000);assert.equal(r.totalIncome,36000000);
 assert.equal(r.startCash+r.totalIncome-r.totalBills-r.totalSpending-r.totalTax,r.ending);
 assert.equal(G.forecast(s,{onceNet:t.onceNeeded/100}).ending,30000000);assert.equal(G.forecast(s,{monthlyNet:t.monthlyNeeded/100}).ending,30000000);
});
test('whole utility payments use due months, retain an earlier phase and cross the year',()=>{
 const s=fixture();s.endMonth='2099-03';C.updateUtility(s,'electricity','amount',601.25);C.updateUtility(s,'electricity','nextMonth','2098-12');
 C.updateUtility(s,'water','amount',201.12);C.updateUtility(s,'water','nextMonth','2100-01');C.updateUtility(s,'gas','amount',0);
 assert.deepEqual(G.forecast(s).rows.map(row=>row.bills),[830000,890125,830000]);
 const before=G.forecast(s).ending;C.updateUtility(s,'electricity','amount',701.25);assert.equal(G.forecast(s).ending,before-10000);
});
test('rates and annual insurance reserve once, edits and removal preserve cents',()=>{
 const s=fixture();C.updateRates(s,3000);const row=C.add(s);C.update(s,row.id,'amount',1200);assert.equal(s.billItems.rates,1000);assert.equal(s.billItems.insurance,100);
 assert.equal(G.forecast(s).ending,18120000);C.update(s,row.id,'frequency','monthly');assert.equal(row.amount,100);C.remove(s,row.id);assert.equal(s.billItems.insurance,0);
});
test('dated bonuses count once, outside-period income stays outside the selected result and ETA uses its date',()=>{
 const s=fixture();s.oneOffs=[{amount:100000,month:'2100-01'}];assert.equal(G.forecast(s).totalOneOffIncome,0);assert.equal(G.forecast(s).excludedOneOffs,1);assert.equal(G.estimateGoal(s).month,'2100-01');
 s.endMonth='2100-01';assert.equal(G.forecast(s).totalOneOffIncome,10000000);
});
test('zero and negative balances stay honest; invalid dates, money and corrupted caches fail closed',()=>{
 const s=fixture();s.monthlyIncome=0;I.update(s,'salary',0);s.oneOffs=[];assert.ok(G.forecast(s).ending<0);
 for(const value of [-1,1.234,'','bad',Infinity])assert.ok(G.validate({...s,startCash:value}).length);
 assert.throws(()=>G.forecast({...s,endMonth:'2099-00'}));assert.throws(()=>G.forecast({...s,billsMonthly:1}));
 C.updateUtility(s,'water','nextMonth','');assert.throws(()=>G.forecast(s));C.updateUtility(s,'water','amount',0);assert.doesNotThrow(()=>G.forecast(s));
});
test('bounded inclusive periods, first-month tax, monthly trial and target-month trial reconcile',()=>{
 const s=fixture();s.startMonth=s.endMonth='2099-01';s.taxTotal=123.45;
 const r=G.forecast(s,{monthlyNet:100,onceNet:200});assert.equal(r.rows.length,1);assert.equal(r.totalTax,12345);assert.equal(r.rows[0].adjustment,30000);
 assert.equal(r.ending,r.totalIncome-r.totalSpending-r.totalBills-r.totalTax);
 assert.throws(()=>G.monthRange('2099-01','2104-01'));assert.throws(()=>G.forecast(s,{onceNet:-1}));
});
module.exports={fixture};

test('goal projection extends beyond the deadline, preserves every selected-period cash flow and stops at first achievement',()=>{
 const s=fixture(),selected=G.forecast(s),p=G.projectToGoal(s);
 assert.ok(p.extended);assert.equal(p.deadlineIndex,11);assert.ok(p.rows.length>12);assert.deepEqual(p.rows.slice(0,12),selected.rows);assert.equal(p.rows.at(-1).month,p.eta.month);assert.ok(p.rows.at(-1).balance>=G.cents(s.goal));assert.ok(p.rows.at(-2).balance<G.cents(s.goal));assert.deepEqual(p.baselineRows,p.rows);
 assert.equal(s.endMonth,'2099-12');assert.equal(selected.ending,19440000);
});
test('extended projection keeps tax, dated bonus and target-month top-up in their original months exactly once',()=>{
 const s=fixture();s.goal=800000;s.taxTotal=123.45;s.oneOffs=[{amount:12345.67,month:'2100-02'},{amount:5000,month:'2099-05'}];const plan={monthlyNet:100,onceNet:987.65},p=G.projectToGoal(s,plan),selected=G.forecast(s,plan);
 assert.deepEqual(p.rows.slice(0,12),selected.rows);assert.equal(p.rows.reduce((n,r)=>n+r.tax,0),12345);assert.equal(p.rows.filter(r=>r.oneOffIncome>0).length,2);assert.equal(p.rows.find(r=>r.month==='2100-02').oneOffIncome,1234567);
 assert.equal(p.rows.find(r=>r.month==='2099-12').adjustment,108765);assert.equal(p.rows.at(-1).adjustment,10000);assert.ok(p.rows.slice(12).every(r=>r.adjustment===10000));
 for(const r of p.rows){assert.equal(r.income-r.spending-r.bills-r.tax,r.netChange);}
});
test('unreachable projections are bounded and an early achievement never hides the remainder of the selected period',()=>{
 const s=fixture();I.update(s,'salary',0);const p=G.projectToGoal(s);assert.equal(p.eta.reached,false);assert.equal(p.rows.length,120);assert.equal(p.rows.at(-1).month,p.eta.limitMonth);
 s.startMonth='2200-01';s.endMonth='2200-12';for(const key of G.utilityKeys)C.updateUtility(s,key,'nextMonth','2200-01');assert.equal(G.projectToGoal(s).rows.length,12);
 const early=fixture();early.startCash=400000;const e=G.projectToGoal(early);assert.equal(e.eta.month,'2099-01');assert.equal(e.rows.length,12);assert.equal(e.extended,false);
});
