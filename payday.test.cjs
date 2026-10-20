const {test}=require('node:test'),assert=require('node:assert/strict');
const G=require('./calculator-model.js'),B=require('./calculator-bills.js'),C=require('./calculator-costs.js'),P=require('./calculator-payday.js');
const fixture=()=>({...G.example(),startMonth:'2099-01',endMonth:'2099-12',goal:60000,monthlyIncome:20000,spendingMonthly:5000,billsMonthly:11500});
test('monthly goal is the total saving needed, distinct from the additional budget gap',()=>{
 const p=P.build(fixture());
 assert.equal(p.requiredMonthly,500000);assert.equal(p.averageMonthly,350000);assert.equal(p.extraMonthly,150000);
 for(const row of p.rows){assert.equal(row.income,2000000);assert.equal(row.spending,500000);assert.equal(row.reserves,1150000);assert.equal(row.saving,350000);}
});
test('existing savings and in-period bonus reduce the goal once; tax still reduces affordability',()=>{
 const s=fixture();s.startCash=6000;s.taxTotal=1200;s.oneOffs=[{amount:12000,month:'2099-06'},{amount:90000,month:'2100-01'}];
 const p=P.build(s);assert.equal(p.requiredMonthly,350000);assert.equal(p.averageMonthly,340000);assert.equal(p.extraMonthly,10000);assert.equal(p.oneOffTotal,1200000);
 assert.equal(p.rows[0].reserves,1270000);assert.equal(p.rows[1].tax,0);assert.equal(p.rows[5].saving,1550000);
});
test('monthly trial income changes affordability while a target-month trial reduces the required regular saving once',()=>{
 const p=P.build(fixture(),{monthlyNet:500,onceNet:6000});assert.equal(p.requiredMonthly,450000);assert.equal(p.averageMonthly,400000);assert.equal(p.extraMonthly,50000);
 assert.equal(p.rows[0].saving,400000);assert.equal(p.rows[11].saving,1000000);assert.equal(p.rows.filter(row=>row.extraIncome).length,1);
});
test('payday uses actual dated utility payments and annual reserves without averaging their cash payments',()=>{
 const s=C.initialise(B.setEmpty(fixture()));s.billItems.housing=10000;
 C.updateUtility(s,'electricity','amount',600);C.updateUtility(s,'water','amount',200);C.updateUtility(s,'gas','amount',0);
 C.updateRates(s,300);const policy=C.add(s);C.update(s,policy.id,'amount',1200);
 const p=P.build(s);assert.equal(p.rows[0].reserves,1100000);assert.equal(p.rows[1].reserves,1020000);assert.equal(p.rows[2].reserves,1080000);
 for(const row of p.rows)assert.equal(row.income+row.drawdown,row.spending+row.reserves+row.saving);
});
test('overspending reports a drawdown instead of an impossible saving transfer, even when existing cash covers the target',()=>{
 const s=fixture();s.startCash=100000;s.monthlyIncome=10000;const p=P.build(s);
 assert.equal(p.requiredMonthly,0);assert.equal(p.averageMonthly,-650000);assert.ok(p.extraMonthly>0);
 for(const row of p.rows){assert.equal(row.saving,0);assert.equal(row.drawdown,650000);assert.equal(row.income+row.drawdown,row.spending+row.reserves+row.saving);}
});
test('cents round toward a sufficient monthly contribution, support one month and preserve the input',()=>{
 const s=fixture();s.goal=10000.01;s.startCash=0;const before=JSON.stringify(s),p=P.build(s);
 assert.equal(p.requiredMonthly,83334);assert.ok(p.requiredMonthly*12>=G.cents(s.goal));assert.equal(JSON.stringify(s),before);
 s.startMonth=s.endMonth='2099-01';s.goal=0;const zero=P.build(s);assert.equal(zero.requiredMonthly,0);assert.equal(zero.rows.length,1);
});
