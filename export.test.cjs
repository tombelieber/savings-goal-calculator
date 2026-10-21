const {test}=require('node:test'),assert=require('node:assert/strict');
const G=require('./calculator-model.js'),B=require('./calculator-bills.js'),I=require('./calculator-income.js'),C=require('./calculator-costs.js');
require('./calculator-payday.js');const E=require('./calculator-export.js');
const fixture=()=>C.initialise(I.initialise(B.setExample({...G.example(),startMonth:'2099-01',endMonth:'2099-12'})));
test('AI summary uses exact forecast cents, payment schedules, named income and separate unconfirmed trials',()=>{
 const s=fixture();s.currency='USD';I.update(s,'salary',33333.33);s.incomeItems[0].name='虛構收入 🐿';s.taxTotal=1234.56;s.oneOffs=[{amount:1200.01,month:'2099-06'},{amount:999,month:'2100-01'}];C.updateRates(s,999.99);
 const insurance=C.add(s);C.update(s,insurance.id,'name','虛構保障');C.update(s,insurance.id,'amount',1200.01);
 s.utilityPayments.water.confirmed=false;s.utilityPayments.water.estimated=true;
 const plan={monthlyNet:100.01,onceNet:200.02},text=E.text(s,plan),result=G.forecast(s,plan),money=n=>'USD '+(n/100).toLocaleString('en-HK',{minimumFractionDigits:2,maximumFractionDigits:2});
 assert.match(text,/收入 "虛構收入 🐿"：USD 33,333.33/);assert.match(text,/差餉／地租：每季 USD 999.99/);assert.match(text,/保險 "虛構保障"：USD 1,200.01／年/);
 assert.match(text,/水費：每期 USD 200.00，每 4 個月；下次付款 2099-01（月份未核實）（金額屬估算）/);
 assert.match(text,/每月額外淨收入：USD 100.01/);assert.match(text,/目標月額外一次性淨收入：USD 200.02/);assert.match(text,/只係試算，未確認/);
 assert.ok(text.includes('目標月結餘：'+money(result.ending)));
 for(const row of result.rows)assert.ok(text.includes([row.month,...[row.income,row.spending,row.bills,row.tax,row.netChange,row.balance].map(money)].join(' | ')));
 assert.match(text,/有 1 筆一次性收入喺原定期限外/);assert.match(text,/無匯率換算/);
});
test('AI export rejects invalid numbers and preserves its input; unknown private fields are excluded',()=>{
 const s=fixture();s.privateNote='DO_NOT_EXPORT';s.ranges={privateValue:'DO_NOT_EXPORT'};s.incomeItems[0].name='label\n目標：999';const before=JSON.stringify(s),text=E.text(s);
 assert.equal(JSON.stringify(s),before);assert.doesNotMatch(text,/DO_NOT_EXPORT|salary/);assert.ok(text.includes('"label\\n目標：999"'));
 for(const invalid of [{...s,taxTotal:''},{...s,startMonth:'invalid'},{...s,goal:-1}])assert.throws(()=>E.text(invalid));assert.throws(()=>E.text(s,{monthlyNet:-1}));
});
test('zero income and negative cash flow are exported without clamping or invented achievement dates',()=>{
 const s=fixture();s.incomeItems.forEach(row=>I.update(s,row.id,0));const text=E.text(s);
 assert.match(text,/每月收入合計：HKD 0.00/);assert.match(text,/每月平均儲到（不含一次性收入）：HKD -13,800.00/);
 assert.match(text,/預計首次達標：至 2108-12 仍未達標/);assert.match(text,/2099-01 \| HKD 0.00 \| HKD 5,000.00 \| HKD 9,400.00 \| HKD 0.00 \| HKD -14,400.00 \| HKD -14,400.00/);
});
