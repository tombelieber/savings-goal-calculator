(function(root){
 'use strict';
 const G=root.SavingsCalculator;
 function text(state,plan={}){
  const errors=[...G.validate(state),...G.validatePlan(plan)];
  if(errors.length)throw new Error(errors[0]);
  const result=G.forecast(state,plan),payday=root.PaydayPlan.build(state,plan,result),eta=G.projectToGoal(state,plan).eta;
  const money=minor=>state.currency+' '+new Intl.NumberFormat('en-HK',{minimumFractionDigits:2,maximumFractionDigits:2}).format(minor/100);
  // Quote user labels so line breaks cannot look like extra report fields.
  const label=(value,fallback)=>JSON.stringify(value||fallback);
  const lines=[
   '請幫我分析以下儲蓄計劃，指出可行性、現金流風險，同可以調整嘅收支。先分清已填資料、未確認試算同缺少資料，唔好自行假設收入或投資回報。',
   '', '【目標及期間】',
   '貨幣：'+state.currency+'（只係顯示貨幣，無匯率換算）',
   '期間：'+state.startMonth+' 至 '+state.endMonth+'（'+result.rows.length+' 個月）',
   '現有可用儲蓄：'+money(G.cents(state.startCash)),
   '目標：'+money(G.cents(state.goal)),
   '', '【每月收支】',
   ...state.incomeItems.map((row,i)=>'收入 '+label(row.name,'收入 '+(i+1))+'：'+money(G.cents(row.amount))),
   '每月收入合計：'+money(G.incomeTotal(state)),
   '日常使費（不含下面帳單及稅金）：'+money(G.cents(state.spendingMonthly))
  ];
  const bills={housing:'租金／按揭',management:'管理費',mobile:'手機',internet:'上網',other:'其他帳單／未拆項總額'};
  for(const [key,title] of Object.entries(bills))lines.push(title+'：每月 '+money(G.cents(state.billItems[key])));
  lines.push('差餉／地租：每季 '+money(G.cents(state.ratesQuarterly))+'，按月預留');
  for(const [i,row] of state.insuranceItems.entries())lines.push('保險 '+label(row.name,'保險 '+(i+1))+'：'+money(G.cents(row.amount))+'／'+(row.frequency==='annual'?'年（按月預留）':'月'));
  lines.push('', '【水電煤付款安排】');
  for(const key of G.utilityKeys){
   const row=state.utilityPayments[key];
   lines.push(({electricity:'電費',water:'水費',gas:'煤氣'}[key])+'：每期 '+money(G.cents(row.amount))+'，每 '+row.every+' 個月；下次付款 '+(row.nextMonth||'未填')+(row.confirmed?'':'（月份未核實）')+(row.estimated?'（金額屬估算）':''));
  }
  lines.push('', '【稅金及一次性收入】','全期稅金預留：'+money(G.cents(state.taxTotal))+'（第一個月扣起，非自動評稅）');
  state.oneOffs.forEach(row=>lines.push('Bonus／一次性收入：'+money(G.cents(row.amount))+'，入帳 '+row.month));
  if(!state.oneOffs.length)lines.push('無已填 Bonus／一次性收入');
  lines.push('', '【未確認額外收入試算】',
   '每月額外淨收入：'+money(G.cents(plan.monthlyNet??0)),
   '目標月額外一次性淨收入：'+money(G.cents(plan.onceNet??0)),
   '以上額外收入只係試算，未確認；淨額已扣新增稅金，唔好當成保證收入。',
   '', '【計算結果（含上述試算）】',
   '目標月結餘：'+money(result.ending),
   '距離目標尚欠：'+money(Math.max(0,G.cents(state.goal)-result.ending)),
   '每月儲蓄目標（扣現有儲蓄及期內一次性收入）：'+money(payday.requiredMonthly),
   '按目前收支，每月平均儲到（不含一次性收入）：'+money(payday.averageMonthly),
   '預計首次達標：'+(eta.reached?eta.month:'至 '+eta.limitMonth+' 仍未達標'),
   '', '【逐月現金流】',
   '月份 | 收入（含額外試算及 Bonus） | 日常使費 | 帳單／預留 | 稅金預留 | 淨增減 | 月末結餘',
   ...result.rows.map(row=>[row.month,...[row.income,row.spending,row.bills,row.tax,row.netChange,row.balance].map(money)].join(' | ')),
   '', '【計算限制】',
   '不計投資回報、通脹或自動稅額估算；水電煤按付款月扣整筆，差餉及年繳保險按月預留。',
   '期限後推算最多延續至10年，固定收支延續，Bonus 只計一次；首次達標後仍可能回落。'
  );
  if(result.excludedOneOffs)lines.push('有 '+result.excludedOneOffs+' 筆一次性收入喺原定期限外，未計入目標月結餘。');
  return lines.join('\n');
 }
 root.PlannerExport={text};
 if(typeof module!=='undefined')module.exports=root.PlannerExport;
})(typeof window==='undefined'?globalThis:window);
